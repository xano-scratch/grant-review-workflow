import { query, input, s, expr, ref, inp, c, obj } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";

// Public. Registers a new applicant. Role is fixed to "applicant" server-side —
// a caller cannot self-assign reviewer or admin. Email uniqueness is enforced
// before the insert (and by the unique index as a backstop).
export const signup = query({
  name: "auth/signup",
  verb: "POST",
  apiGroup: grant,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    // Take the password as text on signup AND login — an f.password() column
    // hashes on write, and input.password would hash again (a double hash that
    // never matches check_password).
    password: input.text({ required: true }),
    name: input.text({ required: true }),
  },
  stack: [
    s.db.has({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      as: "taken",
    }),
    s.precondition({
      expr: expr(ref("taken"), "=", c.bool(false)),
      error_type: "badrequest",
      error: c.text("That email is already registered."),
    }),
    s.db.add({
      table: users,
      row: {
        email: inp("email"),
        password: inp("password"),
        name: inp("name"),
        role: "applicant",
      },
      as: "u",
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  // Project the profile explicitly so the password hash never rides the response.
  response: {
    token: ref("token"),
    user: obj({
      id: ref("u.id"),
      email: ref("u.email"),
      name: ref("u.name"),
      role: ref("u.role"),
    }),
  },
});
