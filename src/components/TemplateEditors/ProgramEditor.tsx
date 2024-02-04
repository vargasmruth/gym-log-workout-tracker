import { useForm } from "react-hook-form";
import "./ProgramEditor.css";
import {
  addProgram,
  editProgram,
} from "../../db/controllers/programController";
import { useNavigate } from "@tanstack/react-router";
import { IProgramView } from "../../db/queries";

// Program Editor
// The program editor will wrap a multi component tree that will involve nested dynamic forms.
// Namely the workout editor, which will allow users to create and edit workouts in a program before saving.
// There will be 0 to many workout editors in a program editor. There is a button to add a new workout editor.
// Each workout editor will have a button to delete itself.
// There will be a button to save the program editor. At that point, the locally stored program will be saved to the database.
// The workout editor is a standalone component in so much as it can be used to create independent workouts that are not part of a program.
// As a result, the workout editor should have it's functionality passed in as props. In the case of being a program editor child it will update the program local state on submit/delete. In case of being a standalone workout editor, it will update the database on save/delete.

// NOTE: Manually syncing with definitions in the db/data files. Will need to obviously move to a source of truth later since the validation of form input and importing data shoud share the same shape.

// TODO: Figure out how to have sort_order work correctly with a draggable library (probably just a field update under the hood with built in tooling - may have to roll though)
type ProgramFormData = {
  name: string;
  description: string;
  author: string;
  // workouts: WorkoutFormData[];
};

export function ProgramEditor({ program }: { program?: IProgramView }) {
  const navigate = useNavigate({ from: "/program/new" });
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProgramFormData>({
    defaultValues: {
      name: program?.program_name,
      description: program?.program_description,
      author: program?.program_author,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    let programId = program?.program_id;
    if (programId) {
      await editProgram(programId, data);
    } else {
      programId = await addProgram(data);
    }
    reset();

    // TODO: Investigate. Maybe can replace history with the api such that a back action would go to programs and not new program.
    navigate({ to: "/program/$id", params: { id: programId } });
  });
  return (
    <>
      <form onSubmit={onSubmit} className="editor">
        <div>
          <div className="form-field">
            <label>Name</label>
            <input
              {...register("name", {
                required: { value: true, message: "Field is required" },
                maxLength: {
                  value: 250,
                  message: "Name cannot be longer than 250 characters",
                },
              })}
            />
            {errors.name?.message && <p> {errors.name.message}</p>}
          </div>
          <div className="form-field">
            <label>Author</label>
            <input {...register("author")} />
          </div>
          <div className="form-field">
            <label>Description</label>
            <textarea {...register("description")} />
          </div>
        </div>
        <button type="submit" className="button--save">
          Save
        </button>
      </form>
    </>
  );
}
