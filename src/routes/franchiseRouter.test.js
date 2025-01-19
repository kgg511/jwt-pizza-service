
const { Role, DB } = require('../database/database.js');
const request = require('supertest');
const app = require('../service');
const {Probar} = require("./routeTestFunctions.js");
const prob = new Probar();

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a'};
let testAdmin;
let testUserAuthToken;

beforeAll(async () => {
    //register user
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  prob.expectValidJwt(testUserAuthToken);

  testAdmin = await prob.createAdminUser(); //set up the admin (added to DB so no need to register)
});

// TESTS START HERE
test("create franchise", async ()=>{ // create a franchise (NOT A FRANCHISE STORE))
    testAdmin = await prob.createAdminUser();
    const adminRes = await prob.signInAdmin(testAdmin);
    const name = prob.randomName(); //string name
    const addRes = await request(app)
    .post("/api/franchise")
    .set('Content-Type', 'application/json').set("Authorization", `Bearer ${adminRes.body.token}`)
    .send({"name": name, "admins": [{"email": testUser.email}]});
    expect(addRes.status).toBe(200);

    //we should sign out after
    await prob.signOutT(adminRes.body.token);
    //{ user: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
})

test("delete franchise", async ()=>{
  const testAdmin = await prob.createAdminUser();
  const franchise = await prob.createFranchiseT(testUser); //manually shove into db
  const adminRes = await prob.signInAdmin(testAdmin); //sign in admin

  //now we attempt to remove said franchise
  const delRes = await request(app)
  .delete(`/api/franchise/${franchise.id}`)
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send();

  expect(delRes.status).toBe(200);
  await prob.signOutT(adminRes.body.token); //doesn't return anything
})

//create franchise store
test("create franchise store", async ()=>{
  testAdmin = await prob.createAdminUser();
  const adminRes = await prob.signInAdmin(testAdmin); //sign in admin uuuhhh the admin has no roles??
  const franchise = await prob.createFranchiseT(testUser); //manually shove into db

  const storeRes = await request(app).post(`/api/franchise/${franchise.id}/store`)
  .set("Content-Type", "application/json")
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send({"franchiseId": franchise.id, "name":franchise.name});

  expect(storeRes.status).toBe(200);

  await prob.signOutT(adminRes.body.token);
})


test("delete franchise store", async ()=>{
  //create store
  //
  testAdmin = await prob.createAdminUser();
  const adminRes = await prob.signInAdmin(testAdmin); //sign in admin uuuhhh the admin has no roles??
  const franchise = await prob.createFranchiseT(testUser); //manually shove into db
  const createRes = await prob.createStoreT(franchise); // { id: insertResult.insertId, franchiseId, name: store.name }

  //we need an admin, a franchise, and a store

  const delRes = await request(app)
  .delete(`/api/franchise/${franchise.id}/store/${createRes.insertId}`)
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send();

  expect(delRes.status).toBe(200);
  await prob.signOutT(adminRes.body.token);

})




