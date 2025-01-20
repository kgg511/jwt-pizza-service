const { DB } = require('../database/database.js');
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch'); // Import fetch after mocking
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

beforeEach(() => {
  jest.clearAllMocks(); // Clear any previous mock state
  fetch.mockClear();
});

beforeAll(async () => {
  //register user

  // testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a'};
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  prob.expectValidJwt(testUserAuthToken);
});

async function add_item(token, item){
  //toke to use to authorize the addition
    const addRes = await request(app).put('/api/order/menu')
    .set('Content-Type', 'application/json').set("Authorization", `Bearer ${token}`)
    .send(item);
  return addRes;
}

///TESTS
test("add item to menu", async()=>{
    testAdmin = await prob.createAdminUser();
    const adminRes = await prob.signInAdmin(testAdmin);
    const newItem = {title: "toxicWaste", description: "AHHHHHHH my leg", image: "pizza1.png", price: 99};
    const addRes = await add_item(adminRes.body.token, newItem);
    expect(addRes.status).toBe(200);

    //the most recent item in the list should look exactly like our item
    const menuRes = await request(app).get("/api/order/menu").send();
    const mostRecentItem = menuRes.body[menuRes.body.length - 1];
    expect(mostRecentItem.title == newItem.title && mostRecentItem.description == newItem.description && 
      mostRecentItem.image == newItem.image && mostRecentItem.price == newItem.price
    ).toBe(true);
    await prob.signOutT(adminRes.body.token);
})

test("add item unauthorized", async ()=>{
  const userRes = await prob.signInAdmin(testUser);
  const newItem = {title: "toxicWaste", description: "AHHHHHHH my leg", image: "pizza1.png", price: 99};
  const addRes = await add_item(userRes.body.token, newItem);
  expect(addRes.status).toBe(403);
  
})

test("make order", async()=>{
  //add item to menu, order said item
  testAdmin = await prob.createAdminUser();
  const adminRes = await prob.signInAdmin(testAdmin);
  const newItem = prob.randomMenuItem();
  const addRes = await DB.addMenuItem(newItem); //{ ...item, id: addResult.insertId }

  //create franchise, create store
  const createFranchiseRes = await prob.createFranchiseT(testUser);
  const createStoreRes = await prob.createStoreT(createFranchiseRes);

  //renme id to menuid
  const addMenuId = {menuId: addRes.id, description: addRes.description, price: addRes.price};
  const mail = {franchiseId: createFranchiseRes.id, storeId: createStoreRes.id, items: [addMenuId]};

  fetch.mockResolvedValueOnce({
    ok: true, // Simulates a failed HTTP request
    status: 200,
    json: jest.fn().mockResolvedValue({
      reportUrl: 'http://example.com/sucess',
    }),
  });
  //order item
  const orderRes = await request(app).post('/api/order')
  .set("Content-Type", "application/json")
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send(mail);

  expect(orderRes.status).toBe(200);

  //check if that order is actually in the orders
  const getOrderRes = await request(app).get("/api/order")
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send();

  const order = getOrderRes.body.orders[0];
  expect(order.franchiseId == mail.franchiseId && order.storeId == mail.storeId 
        && order.items[0].menuId == mail.items[0].menuId && order.items[0].description == mail.items[0].description).toBe(true);
  expect(order.items[0].price).toBeCloseTo(mail.items[0].price, 3);

  await prob.signOutT(adminRes.body.token);
})

test("make order bad", async()=>{
  //add item to menu, order said item
  testAdmin = await prob.createAdminUser();
  const adminRes = await prob.signInAdmin(testAdmin);
  const newItem = prob.randomMenuItem();
  const addRes = await DB.addMenuItem(newItem); //{ ...item, id: addResult.insertId }

  //create franchise, create store
  const createFranchiseRes = await prob.createFranchiseT(testUser);
  const createStoreRes = await prob.createStoreT(createFranchiseRes);

  //renme id to menuid
  const addMenuId = {menuId: addRes.id, description: addRes.description, price: addRes.price};
  const mail = {franchiseId: createFranchiseRes.id, storeId: 9, items: [addMenuId]};

  fetch.mockResolvedValueOnce({
    ok: false, // Simulates a failed HTTP request
    status: 500,
    json: jest.fn().mockResolvedValue({
      reportUrl: 'http://example.com/fail',
    }),
  });

  const orderRes = await request(app).post('/api/order')
  .set("Content-Type", "application/json")
  .set("Authorization", `Bearer ${adminRes.body.token}`)
  .send(mail);

  expect(orderRes.status).toBe(500);

  await prob.signOutT(adminRes.body.token);
})
