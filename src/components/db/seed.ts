import { tableNames } from "./constants";
import { programs } from "./data/programs";
import { workouts } from "./data/workouts";
import { execWithReturn, promiser } from "./promiser";
import * as Exercise from "./schema/Exercise";
import * as MuscleGroup from "./schema/MuscleGroup";
import * as ExerciseMuscleGroup from "./schema/ExerciseMuscleGroup";
import * as Program from "./schema/Program";
import * as Workout from "./schema/Workout";
import * as ProgramWorkout from "./schema/ProgramWorkout";
import * as WorkoutExercise from "./schema/WorkoutExercise";
import * as WorkoutExerciseSet from "./schema/WorkoutExerciseSet";

export const addWorkout = async (workout, programId?) => {
  // ## Workout
  const workoutId = await execWithReturn({
    sql: Workout.insertReturningId(workout),
  });

  if (programId) {
    // ## ProgramWorkout
    await promiser("exec", {
      sql: ProgramWorkout.insert(
        programId,
        workoutId,
        // TODO: Ensure this is required in creating a program workout!
        workout.week,
        workout.day
      ),
    });
  }

  // ## WorkoutExercise
  // NOTE: This will not support creating new exercises on the fly. Future feature.
  if (!workout?.exercises?.length) {
    return;
  }
  for await (const [
    exerciseIndex,
    workoutExercise,
  ] of workout.exercises.entries()) {
    const workoutExerciseInstanceId = await execWithReturn({
      sql: WorkoutExercise.insertReturningInstanceId(
        workoutId,
        workoutExercise.id,
        exerciseIndex
      ),
    });

    // ## WorkoutExerciseSet
    // TODO: FUTURE FEATURE = Validate that the set matches the exercise (eg. reps, weight vs time, distance)
    if (!workoutExercise?.sets?.length) {
      return;
    }
    for await (const [
      setIndex,
      workoutExerciseSet,
    ] of workoutExercise.sets.entries()) {
      await promiser("exec", {
        sql: WorkoutExerciseSet.insert(
          workoutExerciseInstanceId,
          setIndex,
          workoutExerciseSet.reps,
          workoutExerciseSet.weight,
          workoutExerciseSet.time,
          workoutExerciseSet.distance
        ),
      });
    }
  }
};

export const addProgram = async (program) => {
  // ## Program
  const programId = await execWithReturn({
    sql: Program.insertReturningId(program),
  });
  for await (const workout of program.workouts) {
    await addWorkout(workout, programId);
  }
};

export const seedDB = async () => {
  // Clear Old Tables
  await Promise.all(
    Object.values(tableNames).map((tableName) =>
      promiser("exec", { sql: `DROP TABLE IF EXISTS ${tableName}` })
    )
  );

  // Create Tables Anew
  await promiser("exec", {
    sql: MuscleGroup.create,
  });
  await promiser("exec", {
    sql: Exercise.create,
  });
  await promiser("exec", {
    sql: ExerciseMuscleGroup.create,
  });
  await promiser("exec", {
    sql: Program.create,
  });
  await promiser("exec", {
    sql: Workout.create,
  });
  await promiser("exec", {
    sql: ProgramWorkout.create,
  });
  await promiser("exec", {
    sql: WorkoutExercise.create,
  });
  await promiser("exec", {
    sql: WorkoutExerciseSet.create,
  });

  // Populate Tables

  // ## Muscle Groups
  await promiser("exec", {
    sql: MuscleGroup.populateAll,
  });

  // ## Built-In Exercises
  await promiser("exec", {
    sql: Exercise.populateAll,
  });

  // Built-In ExerciseMuscleGroups
  await promiser("exec", {
    sql: ExerciseMuscleGroup.populateAll,
  });

  /**
   * TODO:
   * - Add createdAt values to applicable tables (program, workout)
   */

  // ## Add Programs
  for await (const program of programs) {
    await addProgram(program);
  }

  for await (const workout of workouts) {
    await addWorkout(workout);
  }

  // ## Add Workouts

  // ## TODO: Separate Table For Custom Exercises (lots of logic to join with built-ins. Todo later)
};
