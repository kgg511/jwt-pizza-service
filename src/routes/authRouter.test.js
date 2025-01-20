const request = require('supertest');
const app = require('../service');
const {Probar} = require("./routeTestFunctions.js");
const prob = new Probar();

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

async function registerUser(name, email, password){
  const registerRes = await request(app).post("/api/auth")
  .set('Content-Type', 'application/json')
  .send({name: name, email: email, password: password});
  return registerRes;
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  prob.expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  prob.expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

//register a user with a franchise role

test("register fail", async () =>{
  const registerRes = await registerUser(prob.randomName(), null, prob.randomName());
  expect(registerRes.status).toBe(400);
})

test("update user", async() =>{
  const user = { name: prob.randomName(), email: prob.randomName(), password: prob.randomName() }
  const registerRes = await registerUser(user.name, user.email, user.password);
  expect(registerRes.status).toBe(200);

  //await prob.signOutT(registerRes.body.token); //sign out 
  const testAdmin = await prob.createAdminUser();
  const adminRes = await prob.signInAdmin(testAdmin);

  const updateRes = await request(app).put(`/api/auth/${registerRes.body.user.id}`)
  .set('Content-Type', 'application/json')
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send({email: "whoopity@jwt.com", password: "lo que quieras"});

  expect(updateRes.status).toBe(200);

  await prob.signOutT(adminRes.body.token);

  // register response: { user: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'tttttt' },
})

test("logout user", async() =>{
  const loginRes = await prob.signInAdmin(testUser);
  const logoutRes = await request(app).delete("/api/auth")
  .set("Authorization", `Bearer ${loginRes.body.token}`)
  .send();
  expect(logoutRes.status).toBe(200);
})
