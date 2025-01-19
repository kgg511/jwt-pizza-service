const { Role, DB } = require('../database/database.js');

const {Probar} = require("./routeTestFunctions.js");
const request = require('supertest');
const app = require('../service');

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
});


///TESTS
test("add item to menu", async()=>{
    testAdmin = await prob.createAdminUser();
    const adminRes = await prob.signInAdmin(testAdmin);
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
    await prob.signOutT(adminRes.body.token);
})

test("make order", async()=>{
  //add item to menu, order said item
  testAdmin = await prob.createAdminUser();
  const adminRes = await prob.signInAdmin(testAdmin);
  DB.addMenuItem(prob.randomMenuItem());

  //order item
  const orderRes = await request(app).post('/api/order')
  .set("Content-Type", "application/json")
  .set("Authorization", `Bearer ${adminRes.body.token}`);

  //{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'
  //we need a franchise and a store


  await prob.signOutT(adminRes.body.token);
})

//lets order something
// method: 'POST',
// path: '/api/order',
// requiresAuth: true,
// description: 'Create a order for the authenticated user',
// example: `curl -X POST localhost:3000/api/order -H 'Content-Type: application/json' 
// -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H 'Authorization: Bearer tttttt'`,
// response: { order: { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }], id: 1 }, jwt: '1111111111' },
// },
