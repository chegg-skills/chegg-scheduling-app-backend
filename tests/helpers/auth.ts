import request from "supertest";
import app from "../../src/app";

export interface TestUser {
  token: string;
  id: string;
  email: string;
  role: string;
}

/** Bootstrap the very first SUPER_ADMIN on an empty database. */
export const bootstrapAdmin = async (
  email = "super@test.com",
  password = "TestAdmin1234"
): Promise<TestUser> => {
  const res = await request(app)
    .post("/api/auth/bootstrap")
    .send({
      bootstrapSecret: process.env.BOOTSTRAP_SECRET,
      firstName: "Test",
      lastName: "Admin",
      email,
      password,
    });

  if (res.status !== 201) {
    throw new Error(
      `bootstrapAdmin failed (${res.status}): ${JSON.stringify(res.body)}`
    );
  }

  return {
    token: res.body.data.token,
    id: res.body.data.user.id,
    email: res.body.data.user.email,
    role: res.body.data.user.role,
  };
};

/** Register a new user as an authenticated admin. */
export const registerUser = async (
  adminToken: string,
  payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  }
): Promise<TestUser> => {
  const res = await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(payload);

  if (res.status !== 201) {
    throw new Error(
      `registerUser failed (${res.status}): ${JSON.stringify(res.body)}`
    );
  }

  return {
    token: res.body.data.token,
    id: res.body.data.user.id,
    email: res.body.data.user.email,
    role: res.body.data.user.role,
  };
};
