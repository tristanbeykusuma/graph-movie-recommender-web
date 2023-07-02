const neo4j = require('neo4j-driver');
let driver;
let session;
(async () => {
    // URI examples: 'neo4j://localhost', 'neo4j+s://xxx.databases.neo4j.io'
    const URI = 'neo4j+s://3b37ebc5.databases.neo4j.io'
    const USER = 'neo4j'
    const PASSWORD = 'KX14ajBwk3nD-nD1Q66_914tRhTa6hc4eIiyoIoiTXY'
    let driver

    try {
        driver = neo4j.driver(URI,  neo4j.auth.basic(USER, PASSWORD))
        const serverInfo = await driver.getServerInfo()
        console.log('Connection estabilished')
        console.log(serverInfo)
        session = await driver.session({ database: 'neo4j' });
    } catch(err) {
        console.log(`Connection error\n${err}\nCause: ${err.cause}`)
    }
})();

const predictOutput = document.getElementById('result');

async function showMovieWatch() {     
    console.log('showing movies...');
    const userId = document.getElementById('userInput').value;  

    try {
    if(userId==''){
        predictOutput.innerHTML = `<p> Loading... </p>`;
        const { records, summary } = await session.executeRead(async tx => {
            return await tx.run(`
            MATCH (A:Movies) RETURN A ORDER BY A.rating_mean descending  LIMIT 25
            `, { userid: userId }
            )
        })
        console.log(
            `The query ${summary.query.text} returned ${records.length} nodes.`
        )
        predictOutput.innerHTML = `<p> No ID detected, here are some movies ranked : </p>`;

        let i = 1;
        for(let record of records) {
            predictOutput.innerHTML += `<p> ${i}. ${record._fields[0].properties.title} </p>`;
            i++;
        }
        return null;
    }
    predictOutput.innerHTML = `<p> Loading... </p>`;
    const { records, summary } = await session.executeRead(async tx => {
        return await tx.run(`
        MATCH path = (u:Users)-[:WATCHED]->(m1:Movies)
        WHERE u.userId =~$userid
        RETURN u.userId, m1.title, m1.rating_mean
        ORDER BY m1.rating_mean descending
        `, { userid: userId }
        )
    })
    console.log(
        `The query ${summary.query.text} returned ${records.length} nodes.`
    )
    predictOutput.innerHTML = `<p> Movies user has watched : </p>`;

    let i = 1;
    for(let record of records) {
        predictOutput.innerHTML += `<p> ${i}. ${record.get('m1.title')} (rated ${Math.round(record.get('m1.rating_mean')*10)/10})</p>`;
        i++;
    }

    } catch (error) {
      console.log(error);
    }
}

async function showRecommendation() {
    console.log('showing recommended movies...');
    const userId = document.getElementById('userInput').value;  

    try {
    if(userId==''){
        predictOutput.innerHTML = `<p> Please input a user id number </p>`;
        return null;
    }
    predictOutput.innerHTML = `<p> Loading... </p>`;
    const { records, summary } = await session.executeRead(async tx => {
        return await tx.run(`
        MATCH (u1:Users)-[:WATCHED]->(m3:Movies)
        WHERE u1.userId =~$userid
        WITH [i in m3.movieId | i] as movies
        MATCH path = (u:Users)-[:WATCHED]->(m1:Movies)-[s:SIMILAR]->(m2:Movies),
        (m2)-[:GENRES]->(g:Genres),
        (u)-[:FAVORITE]->(g)
        WHERE u.userId =~$userid and not m2.movieId in movies
        RETURN distinct u.userId as userId, g.genres as genres, 
        m2.title as title, m2.rating_mean as rating
        ORDER BY m2.rating_mean descending
        LIMIT 5
        `, { userid: userId }
        )
    })
    console.log(
        `The query ${summary.query.text} returned ${records.length} nodes.`
    )
    predictOutput.innerHTML = `<p> Movies recommended based on user's favorite genre (${records[0].get('genres')}) : </p>`;
    
    let i = 1;
    for(let record of records) {
        predictOutput.innerHTML += `<p> ${i}. ${record.get('title')} (rated ${Math.round(record.get('rating')*10)/10})</p>`;
        i++;
    }

    } catch (error) {
      console.log(error);
    }
}

const movieBtn = document.getElementById('movie-watched-btn');

movieBtn.addEventListener("click", showMovieWatch);   

const recBtn = document.getElementById('recommend-btn');

recBtn.addEventListener("click", showRecommendation);  