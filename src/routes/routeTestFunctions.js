//creating a class
const { Role, DB } = require('../database/database.js');
const request = require('supertest');
const app = require('../service');

class Probar{

    constructor(){
    }

    randomName() {
        return Math.random().toString(36).substring(2, 12);
    }
    randomNumber(min, max){
        return Math.random() * (max - min) + min;
    }
    randomMenuItem(){
        return {title: this.randomName(), description: this.randomName(), image: "pizza1.png", price: this.randomNumber(0, 99)};
    }
    expectValidJwt(potentialJwt) {
        expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
    }

    async createAdminUser() {
        let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
        user.name = prob.randomName();
        user.email = user.name + '@admin.com';
      
        user = await DB.addUser(user);
        return { ...user, password: 'toomanysecrets' };
      }
    async signInAdmin(testAdmin){ //signs in the test Admin created in the before all
        const adminRes = await request(app).put('/api/auth').send(testAdmin); //sign in
        expect(adminRes.status).toBe(200);
        return adminRes;
    }
    async signOutT(token){
        await DB.logoutUser(token);
    }

    //franchise related functions
    async createFranchiseT(testUser){
      //add franchise to the db
      const name = this.randomName();
      const testFranchise = {"name": name, "admins": [{"email": testUser.email}]};
      const franchise = await DB.createFranchise(testFranchise); //forces it in so we shouldn't need to be logged in as admin
      return franchise;
    }

    async createStoreT(franchise){
        const createRes = await DB.createStore(franchise.id, franchise); //{ id: insertResult.insertId, franchiseId, name: store.name };
        return createRes;
      }



}

const prob = new Probar();
module.exports = { Probar };