const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let registerRes;
let adminLoginRes;
let admin;
let franchiseName = randomName();

beforeAll(async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);
  
    admin = await createAdminUser();
    adminLoginRes = await request(app).put('/api/auth').send(admin);
  });


test('list franchises', async () => {
    const franchiseListRes = await request(app).get('/api/franchise').send(admin);

    expect(franchiseListRes.status).toBe(200);
    expect(franchiseListRes.body).toEqual([]); // database shouldn't have any franchises
});

test('list users franchises', async () => {
    const franchiseListRes = await request(app).get(`/api/franchise/${registerRes.body.user.id}`).set('Authorization', `Bearer ${adminLoginRes.body.token}`);

    expect(franchiseListRes.status).toBe(200);
    expect(franchiseListRes.body).toEqual([]); // new user shouldn't have any franchises
});

test('create franchise', async () => {
    const newFranchise = { name: franchiseName, admins: [admin]};

    const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(newFranchise);

    expect(createFranchiseRes.status).toBe(200);
    expect(createFranchiseRes.body.name).toBe(franchiseName);
    expect(createFranchiseRes.body.admins).toEqual([admin]);
});

test('delete franchise', async () => {
    const newFranchise = { name: franchiseName, admins: [admin]};

    const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(newFranchise);

    const deleteFranchiseRes = await request(app).delete(`/api/franchise/${createFranchiseRes.body.id}`).set('Authorization', `Bearer ${adminLoginRes.body.token}`).send(newFranchise);

    expect(deleteFranchiseRes.status).toBe(200);
    expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
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