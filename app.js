"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PD = require('probability-distributions');
const raw = `Aditya	MMR:	2,1	Roles:	7000
n0Corn	MMR:	1,2,3,4,5	Roles:	5500
Andrey	MMR:	1,3	Roles:	5000
Charbz	MMR:	3,1,4,2,5	Roles:	5100
valor248	MMR:	5,4	Roles:	5900
smowee	MMR:	3,4,5	Roles:	5300
Captain's Mast	MMR:	3,5	Roles:	6750
Ximm	MMR:	1,2,3	Roles:	4960
Desertion	MMR:	4,5	Roles:	4800
Mogul khan	MMR:	5,4,3	Roles:	4800`;
function getData(dat) {
    const output = [];
    const data = dat.split('\n').map(x => x.split('\t'));
    for (let i = 0; i < data.length; i++) {
        const cur = data[i];
        const prefs = cur[2].split(',').map(x => +x - 1);
        output.push({
            name: cur[0],
            mmr: +cur[4],
            preferredRoles: prefs,
        });
    }
    return output;
}
function makeRandom(players) {
    const output = [];
    for (let i = 0; i < players; i++) {
        const name = `${i}`;
        let pick1 = (Math.random() * 5) | 0;
        let pick2 = (Math.random() * 4) | 0;
        if (pick2 >= pick1)
            pick2++;
        let mmr = 0;
        while (mmr < 3000)
            mmr = PD.rnorm(1, 2200, 1300)[0];
        mmr = ((mmr / 10) | 0) * 10;
        output.push({
            mmr: mmr,
            name: name,
            preferredRoles: [pick1, pick2],
        });
    }
    return output;
}
const ROLES_ON_TEAM = 5;
function makeTeams(input) {
    const output = [];
    for (let i = 0; (i + 1) * ROLES_ON_TEAM - 1 < input.length; i++) {
        const players = [];
        let mmr = 0;
        let bestmmr = -Infinity;
        for (let j = 0; j < ROLES_ON_TEAM; j++) {
            const pl = input[i * ROLES_ON_TEAM + j];
            players.push(pl);
            mmr += pl.mmr;
            if (pl.mmr > bestmmr)
                bestmmr = pl.mmr;
            if (j < 2)
                mmr += pl.mmr * .1;
        }
        const rating = (mmr + (bestmmr / 2)) / 5.7;
        output.push({ players: players.map(x => JSON.stringify({ name: x.name, mmr: x.mmr, preferenes: x.preferredRoles.map(x => x + 1) })), weightedRating: rating, rating: mmr / 5 });
    }
    return output;
}
function init(input) {
    for (let i = 1; i < input.length; i++) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = input[i];
        input[i] = input[j];
        input[j] = tmp;
    }
    return input;
}
function _getCost(input) {
    function teamRating(team) {
        let max = -Infinity;
        let sum = 0;
        for (let i = 0; i < ROLES_ON_TEAM; i++) {
            const current = input[i + ROLES_ON_TEAM * team].mmr;
            if (current > max)
                max = current;
            sum += current;
            if (i < 2)
                sum += current * 0.1;
        }
        return sum + max;
    }
    const teams = ((input.length / ROLES_ON_TEAM) | 0);
    const teamRatings = [];
    for (let i = 0; i < teams; i++) {
        teamRatings.push(teamRating(i));
    }
    const avgTeamRating = teamRatings.reduce((a, b) => a + b) / teams;
    const ratingDifference = teamRatings.map(x => Math.abs(x - avgTeamRating)).reduce((a, b) => a + b);
    let badLocations = 0;
    for (let i = teams * ROLES_ON_TEAM - 1; i >= 0; i--) {
        const current = input[i].preferredRoles;
        const role = i % 5;
        const len = current.length;
        let j = 0;
        for (; j < len; j++) {
            const cur = current[j];
            if (role === cur) {
                badLocations += j;
                break;
            }
        }
        if (j === len) {
            badLocations += 1000;
        }
    }
    return { ratingDifference: ratingDifference, badLocations: badLocations, rating: (ratingDifference + 10) * (badLocations + 0.01) };
}
function getCost(input) {
    const c = _getCost(input);
    return c.rating;
}
/**
 * Returns true if there is a better neighbor than input.
 * @param input A setup person array describing a team composition set. This gets mutated to the best neighbor.
 * @param cost the cost of the initial input.
 * @returns true if finds better neighbor otherwise false.
 */
function makeBestNeighbor(input, cost) {
    const lastPosition = input.length - 1;
    let bestCost = cost;
    let best_i;
    let best_j;
    for (let i = 0; i < lastPosition; i++) {
        const temp_i = input[i];
        for (let j = i + 1; j <= lastPosition; j++) {
            //swap
            const temp_j = input[j];
            input[j] = temp_i;
            input[i] = temp_j;
            const cost = getCost(input);
            if (cost < bestCost) {
                bestCost = cost;
                best_i = i;
                best_j = j;
            }
            input[j] = temp_j;
        }
        input[i] = temp_i;
    }
    if (bestCost < cost) {
        const tmp = input[best_i];
        input[best_i] = input[best_j];
        input[best_j] = tmp;
    }
    return bestCost;
}
function hillClimb(data) {
    data = init(data);
    let cost = getCost(data);
    while (true) {
        const newCost = makeBestNeighbor(data, cost);
        if (newCost === cost)
            break;
        cost = newCost;
    }
    return data;
}
const dat = getData(raw);
const start = new Date();
const output = [];
for (let i = 0; i < 100; i++)
    output.push(hillClimb([...dat]));
const time = new Date().getTime() - start.getTime();
let bestCost = { idx: 0, val: Infinity };
let bestPos = { idx: 0, val: Infinity };
let bestMMR = { idx: 0, val: Infinity };
for (let i = 0; i < output.length; i++) {
    const c = _getCost(output[i]);
    if (c.badLocations < bestPos.val)
        bestPos = { idx: i, val: c.badLocations };
    if (c.rating < bestCost.val)
        bestCost = { idx: i, val: c.rating };
    if (c.ratingDifference < bestMMR.val)
        bestMMR = { idx: i, val: c.ratingDifference };
}
console.log("Best overall rating:");
console.log(_getCost(output[bestCost.idx]));
console.log("Best on only rating difference:");
console.log(_getCost(output[bestMMR.idx]));
console.log("Best on only position preference:");
console.log(_getCost(output[bestPos.idx]));
console.log(makeTeams(output[bestCost.idx]));
dat.sort((a, b) => b.mmr - a.mmr);
console.log(dat);
console.log(time);
setTimeout(() => { }, 1000 * 60 * 60);
//# sourceMappingURL=app.js.map



console.log(fn(40,2))
/**
 * This function finds the number of possible swaps for a sample n and swap size k
 * @param {*} n 
 * @param {*} k 
 */
function fn(n, k) {
    let output = 1;
    if(3 * k > n) {
        for(let i = k + 1; i <= n; i++)
            output *= i;
        for(let i = n - 2 * k; i > 1; i--)
            output /= i;
    } else {
        for(let i = n - 2 * k + 1; i <= n; i++)
            output *= i;
        for(let i = k; i > 1; i--)
            output /= i;
    }
    return output >> 1;
}

