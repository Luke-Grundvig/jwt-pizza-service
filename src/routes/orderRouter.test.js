const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let registerRes;
let adminLoginRes;
let admin;

beforeAll(async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);
  
    admin = await createAdminUser();
    adminLoginRes = await request(app).put('/api/auth').send(admin);
  });

test('get pizza menu', async () => {
    const pizzaMenuRes = await request(app).get('/api/order/menu').send(testUser);

    expect(pizzaMenuRes.status).toBe(200);
    expect(pizzaMenuRes.body).toEqual([]); // new database shouldn't have any menu items
});

test('add item to menu', async () => {
    let menuItem = {title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001 };
    const addMenuItemRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(menuItem);

    expect(addMenuItemRes.status).toBe(200);
    expect(addMenuItemRes.body).toEqual([menuItem]);
});

test('get orders for user', async () => {
    const ordersRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send(testUser);

    expect(ordersRes.status).toBe(200);
    expect(ordersRes.body.orders).toEqual([]); // new user shouldn't have any orders
});

  function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }
  
  function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }
  
  async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
  }