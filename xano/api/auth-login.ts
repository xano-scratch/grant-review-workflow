import { query, input, s, expr, ref, inp, c, obj } from "@xanots/sdk";
import { grant } from "./grant.js";
import { users } from "../tables/users.js";

// Public. Verifies credentials and mints a bearer token the client sends as
// `Authorization: Bearer <token>` on every protected call.
export const login = query({
  name: "auth/login",
  verb: "POST",
  apiGroup: grant,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    password: input.text({ required: true }),
  },
  stack: [
    // `output` MUST name password — the column is access:"internal" and is absent
    // from the row otherwise, so check_password would have nothing to compare.
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
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
