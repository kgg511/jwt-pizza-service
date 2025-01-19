
const { Role, DB } = require('../database/database.js');
const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a'};
let testAdmin;
let testUserAuthToken;

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}
function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

async function createStoreT(franchise){
  createRes = await DB.createStore(franchise.id, franchise); //{ id: insertResult.insertId, franchiseId, name: store.name };
  return createRes;
}


async function createFranchiseT(){
  //add franchise to the db
  const name = randomName();
  const testFranchise = {"name": name, "admins": [{"email": testUser.email}]};
  const franchise = await DB.createFranchise(testFranchise); //forces it in so we shouldn't need to be logged in as admin
  return franchise;
}
async function signInAdmin(){ //signs in the test Admin created in the before all
  console.log(testAdmin);
  const adminRes = await request(app).put('/api/auth').send(testAdmin); //sign in
  expect(adminRes.status).toBe(200);
  return adminRes;
}
async function signOutT(token){
  //sign out whoever needs to get signed out
  await DB.logoutUser(token);
}

beforeAll(async () => {
    //register user
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  testAdmin = await createAdminUser(); //set up the admin (added to DB so no need to register)
});

// TESTS START HERE
test("create franchise", async ()=>{ // create a franchise (NOT A FRANCHISE STORE))
    const adminRes = await signInAdmin();
    const name = randomName(); //string name
    const addRes = await request(app)
    .post("/api/franchise")
    .set('Content-Type', 'application/json').set("Authorization", `Bearer ${adminRes.body.token}`)
    .send({"name": name, "admins": [{"email": testUser.email}]});
    expect(addRes.status).toBe(200);

    //we should sign out after
    await signOutT(adminRes.body.token);

    //getFranchises(authUser)
    //franchises = await DB.getFranchises(adminRes);
    //{ user: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }
})

test("delete franchise", async ()=>{
  const franchise = createFranchiseT(); //manually shove into db
  const adminRes = await signInAdmin(); //sign in admin

  //now we attempt to remove said franchise
  const delRes = await request(app)
  .delete(`/api/franchise/${franchise.id}`)
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send();

  expect(delRes.status).toBe(200);
  await signOutT(adminRes.body.token); //doesn't return anything
})

//create franchise store
test("create franchise store", async ()=>{
  testAdmin = await createAdminUser();
  const adminRes = await signInAdmin(); //sign in admin uuuhhh the admin has no roles??
  const franchise = await createFranchiseT(); //manually shove into db

  const storeRes = await request(app).post(`/api/franchise/${franchise.id}/store`)
  .set("Content-Type", "application/json")
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send({"franchiseId": franchise.id, "name":franchise.name});

  expect(storeRes.status).toBe(200);

  await signOutT(adminRes.body.token);
})



test("delete franchise store", async ()=>{
  //create store
  //
  testAdmin = await createAdminUser();
  const adminRes = await signInAdmin(); //sign in admin uuuhhh the admin has no roles??
  const franchise = await createFranchiseT(); //manually shove into db
  const createRes = await createStoreT(franchise); // { id: insertResult.insertId, franchiseId, name: store.name }

  //we need an admin, a franchise, and a store

  const delRes = await request(app)
  .delete(`/api/franchise/${franchise.id}/store/${createRes.insertId}`)
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send();

  expect(delRes.status).toBe(200);
  await signOutT(adminRes.body.token);

})

// method: 'DELETE',
//     path: '/api/franchise/:franchiseId/store/:storeId',
//     requiresAuth: true,
//     description: `Delete a store`,
//     example: `curl -X DELETE localhost:3000/api/franchise/1/store/1  -H 'Authorization: Bearer tttttt'`,
//     response: { message: 'store deleted' },
//   },



