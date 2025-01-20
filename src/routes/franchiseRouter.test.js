
const { Role, DB } = require('../database/database.js');
const request = require('supertest');
const app = require('../service');
const {Probar} = require("./routeTestFunctions.js");
const prob = new Probar();

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a'};
let testAdmin;
let testUserAuthToken;
if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
    //register user
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  prob.expectValidJwt(testUserAuthToken);

  testAdmin = await prob.createAdminUser(); //set up the admin (added to DB so no need to register)
});


async function createFranchise(name, auth_token, person_to_be_franchisee){
  const addRes = await request(app)
  .post("/api/franchise")
  .set('Content-Type', 'application/json').set("Authorization", `Bearer ${auth_token}`)
  .send({"name": name, "admins": [{"email": person_to_be_franchisee.email}]});
  return addRes;
}

async function deleteFranchise(auth_token, franchisee){
  const franchise = await prob.createFranchiseT(franchisee); //manually shove into db

  //now we attempt to remove said franchise
  const delRes = await request(app)
  .delete(`/api/franchise/${franchise.id}`)
  .set("Authorization", `Bearer ${auth_token}`)
  .send();
  return delRes;
}

async function createFranchiseStore(auth_token, franchise){
  const storeRes = await request(app).post(`/api/franchise/${franchise.id}/store`)
  .set("Content-Type", "application/json")
  .set("Authorization", `Bearer ${auth_token}`)
  .send({"franchiseId": franchise.id, "name":franchise.name});
  return storeRes;
}


// TESTS START HERE
test("create franchise", async ()=>{ // create a franchise (NOT A FRANCHISE STORE))
    testAdmin = await prob.createAdminUser();
    const adminRes = await prob.signInAdmin(testAdmin);
    const name = prob.randomName(); //string name
    const addRes = await createFranchise(name, adminRes.body.token, adminRes.body.user);
    expect(addRes.status).toBe(200);

    //check if the user now has a franchise
    getFranchiseRes = await request(app).get(`/api/franchise/${adminRes.body.user.id}`)
    .set("Authorization", `Bearer ${adminRes.body.token}`)
    .send();
    expect(getFranchiseRes.status).toBe(200);

    expect(getFranchiseRes.body[getFranchiseRes.body.length-1].name == name).toBe(true);
    //response: [{ id: 2, name: 'pizzaPocket', admins: [], stores: [{ id: 4, name: 'SLC', totalRevenue: 0 }] }],

    await prob.signOutT(adminRes.body.token);
    //{ user: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
})

test("create franchise unauthorized", async()=>{
  const UserRes = await prob.signInAdmin(testUser);
  const name = prob.randomName();
  const addRes = await createFranchise(name, UserRes.body.token, testUser);
  expect(addRes.status).toBe(403);
  await prob.signOutT(UserRes.body.token);
})

test("delete franchise", async ()=>{
  const testAdmin = await prob.createAdminUser();
  const adminRes = await prob.signInAdmin(testAdmin); //sign in admin
  const delRes = await deleteFranchise(adminRes.body.token, testUser); //gives and deletes franchise
  expect(delRes.status).toBe(200);
  await prob.signOutT(adminRes.body.token); //doesn't return anything
})

test("delete franchise unauthorized", async()=>{
  const loginRes = await prob.signInAdmin(testUser); //sign in admin
  const delRes = await deleteFranchise(loginRes.body.token, testUser); //gives and deletes franchise
  expect(delRes.status).toBe(403);
  await prob.signOutT(loginRes.body.token); //doesn't return anything
})

//create franchise store
test("create franchise store", async ()=>{
  testAdmin = await prob.createAdminUser();
  const adminRes = await prob.signInAdmin(testAdmin); //sign in admin uuuhhh the admin has no roles??
  const franchise = await prob.createFranchiseT(testUser); 
  const storeRes = await createFranchiseStore(adminRes.body.token, franchise);
  expect(storeRes.status).toBe(200); //createFranchiseStore(auth_token, franchise)

  await prob.signOutT(adminRes.body.token);
})

test("create franchise store unauthorized", async()=>{
  const otherUser = await prob.createDinerUser();
  const loginRes = await prob.signInAdmin(otherUser);
  const franchise = await prob.createFranchiseT(testUser); 
  //attempt to create franchise store without authentication from either an admin or the franchise
  const storeRes = await createFranchiseStore(loginRes.body.token, franchise);
  expect(storeRes.status).toBe(403);

  await prob.signOutT(loginRes.body.token);
})


test("delete franchise store", async ()=>{
  //create store
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




