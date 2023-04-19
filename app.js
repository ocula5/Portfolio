const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');


const wss = new WebSocket.Server({port: 8080}, ()=> {
    console.log('server started');
});

wss.on('connection', (ws)=> {
    ws.on('message', (data)=> {
        console.log('Get Packet :'+`${data}`);

        const Packet = JSON.parse(data);
        const SavePath = path.join(__dirname, `User`, `${Packet.steamId}`, `${Packet.steamId}.json`);
        const DeckPath = path.join(__dirname, `User`, `${Packet.steamId}`, `${Packet.steamId}Deck.json`);
        const HandPath = path.join(__dirname, `User`, `${Packet.steamId}`, `${Packet.steamId}Hand.json`);
        const makeFolder =(SavePath)=>{
            if(!fs.existsSync(SavePath)) {
                fs.mkdirSync(SavePath);
            }
        }

        makeFolder(`User\/${Packet.steamId}`);
        switch(Packet.header)
        {
            case 'LogIn':
                console.log(Packet.data + ' is Log In');
                const player = Packet.data;
                fs.access(SavePath, fs.constants.F_OK, (err) => {
                    if(err) {
                        //파일 없음, 클라이언트에서 신규 데이터 생성 -> 서버로 저장
                        ws.send(JSON.stringify({"steamId" :`${Packet.steamId}`,"header": "NewPlayer", "data": "" }));
                    }
                    else {//파일 있음, 데이터 불러옴
                        console.log("Load Player Data . . .");
                        const PlayerfileData = fs.readFileSync(SavePath, 'utf-8');
                        const PlayerDeckData = fs.readFileSync(DeckPath, 'utf-8');
                        const PlayerHandData = fs.readFileSync(HandPath, 'utf-8');
                        ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "PlayerInfo", "data": PlayerfileData })); //카드 데이터 전송
                        ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "DeckInfo", "data": PlayerDeckData }));
                        ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "HandInfo", "data": PlayerHandData }));
                        ws.send("Card Data Loaded");
                    }
                })
                break;
            case 'SaveInfo'://클라이언트로 부터 받은 데이터 저장
                const SaveData = Packet.data;
                fs.writeFileSync(SavePath, SaveData);
                ws.send("Data Saved");
                break;
            case 'SaveDeck':
                const DeckData = Packet.data;
                fs.writeFileSync(DeckPath , DeckData);
                break;
            case 'SaveHand':
                const HandData = Packet.data;
                fs.writeFileSync(HandPath, HandData);
                break;
            case 'Request-Card'://요청받은 카드 데이터 전송
                const CardData = (fs.readFileSync('./Data/Cards.json', 'utf-8'));
                ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "CardData", "data": CardData})); //카드 데이터 전송
                ws.send("Card Data Loaded");
                break;
            case 'Request-PlayerInfo':// 요청받은 플레이어 정보 클라이언트에 제공
                console.log("Load Player Data . . .");
                const PlayerfileData = fs.readFileSync(SavePath, 'utf-8');
                ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "PlayerInfo", "data": PlayerfileData })); //카드 데이터 전송
                ws.send("Card Data Loaded");
                break;
            case 'Request-DeckInfo':
                console.log("Load Deck Data . . .");
                const PlayerDeckData = fs.readFileSync(DeckPath, 'utf-8');
                ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "DeckInfo", "data": PlayerDeckData }));
                break;
            case 'Request-HandInfo':
                console.log("Load Hand Data . . .");
                const PlayerHandData = fs.readFileSync(HandPath, 'utf-8');
                ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "HandInfo", "data": PlayerHandData }));
                break;
            case 'EnList':
                var EnList = JSON.parse(Packet.data);
                const EnListPath = path.join(__dirname, `EnList`, `${JSON.parse(Packet.data).round}`, `${JSON.parse(Packet.data).teamName}.json`);
                fs.writeFileSync(EnListPath , Packet.data);
                break;
            case 'Start': // 전투 시작 - Battle Manager와 통신
                const round = Packet.data;
                const MyTeam = fs.readFileSync(DeckPath, 'utf-8');
                ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "MyTeam", "data": MyTeam })); //저장된 덱 데이터 불러오기
                const EnemyList = fs.readdirSync(path.join(__dirname, `EnList`, `${JSON.parse(Packet.data).round}`))
                const randomIndex = Math.floor(Math.random() * EnemyList.length);
                const randomEnemy = EnemyList[randomIndex];
                ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "Enemy", "data": fs.readFileSync(path.join(__dirname, `EnList`, `${JSON.parse(Packet.data).round}`, randomEnemy), 'utf-8')}));
                break;
            case 'Message': //메시지 패킷
                console.log(Packet.data);
                break;
            case 'Win':
                var playerData = JSON.parse(fs.readFileSync(SavePath, 'utf-8'));
                playerData.round += 1;
                playerData.win += 1;
                playerData.money = 10;
                if(playerData.win == 10)
                {
                    ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "GameOver", "data": "" }))
                }
                else
                {
                    fs.writeFileSync(SavePath , JSON.stringify(playerData));
                    ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "Win", "data": "" }));
                }
                break;
            case 'Lose':
                var playerData = JSON.parse(fs.readFileSync(SavePath, 'utf-8'));
                console.log(playerData);
                playerData.round += 1;
                playerData.health -= 1;
                playerData.money = 10;
                if(playerData.health < 1)
                {
                    ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "GameOver", "data": "" }))
                }
                else
                {
                    console.log(playerData);
                    fs.writeFileSync(SavePath , JSON.stringify(playerData));
                    ws.send(JSON.stringify({ "steamId" :`${Packet.steamId}`,"header": "Lose", "data": "" }));
                }
                break;
            default:
                console.log(`Unknown Packet`);
                break;
        }
    })
})

wss.on('close', ()=> {
    console.log('a');
})

wss.on('listening', ()=>{
    console.log('server is listening on port 8080');
})