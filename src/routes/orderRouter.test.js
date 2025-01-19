const { Role, DB } = require('../database/database.js');
const request = require('supertest');
const app = require('../service');

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
expectValidJwt(testUserAuthToken);

testAdmin = await createAdminUser(); //set up the admin (added to DB so no need to register)
});

//add item to the menu, then get the menu to see if it contains said item
//order something, then check if its there
function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }
function randomName() {
    return Math.random().toString(36).substring(2, 12);
}
function randomNumber(min, max){
  return Math.random() * (max - min) + min;
}
// function randomMenuItem(){
//   //const newItem = {title: "toxicWaste", description: "AHHHHHHH my leg", image: "pizza1.png", price: 99}
//   const title = randomName();
//   const description = random
  

// }
async function signInAdmin(){ //signs in the test Admin created in the before all
    console.log(testAdmin);
    const adminRes = await request(app).put('/api/auth').send(testAdmin); //sign in
    expect(adminRes.status).toBe(200);
    return adminRes;
  }


async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
  }
async function signOutT(token){
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


///TESTS
test("add item to menu", async()=>{
    testAdmin = await createAdminUser();
    const adminRes = await signInAdmin();
    const newItem = {title: "toxicWaste", description: "AHHHHHHH my leg", image: "pizza1.png", price: 99}
    const addRes = await request(app).put('/api/order/menu')
    .set('Content-Type', 'application/json').set("Authorization", `Bearer ${adminRes.body.token}`)
    .send(newItem);
    expect(addRes.status).toBe(200);

    //the most recent item in the list should look exactly like our item
    const menuRes = await request(app).get("/api/order/menu").send();
    mostRecentItem = menuRes.body[menuRes.body.length - 1];
    expect(mostRecentItem.title == newItem.title && mostRecentItem.description == newItem.description && 
      mostRecentItem.image == newItem.image && mostRecentItem.price == newItem.price
    );
    await signOutT(adminRes.body.token);
})

test("make order", async()=>{
  //add item to menu, order said item
  DB.addMenuItem(item);
  const newItem = {title: "toxicWaste", description: "AHHHHHHH my leg", image: "pizza1.png", price: 99}


})

//lets order something
// method: 'POST',
// path: '/api/order',
// requiresAuth: true,
// description: 'Create a order for the authenticated user',
// example: `curl -X POST localhost:3000/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H 'Authorization: Bearer tttttt'`,
// response: { order: { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }], id: 1 }, jwt: '1111111111' },
// },
