const express = require('express');
const handlebars = require('express-handlebars').create({ defaultLayout:'main' });
var PORT = (process.argv[2] || 5000);
var https = require('https');
const session = require('express-session');
const bodyParser = require('body-parser');
var _ = require('lodash')
const fs = require('fs');

var discard = [];
const app = express();
const colorMap = {1:"#780116", 2:"#F95738", 3:"#C38209", 4:"#3E5622", 5:"#0D3B66", 6:"#FC60A8"};
const nameMap = {1:"1", 2:"2", 3:"3", 4:"4", 5:"5", 6:"6"};

// DON'T CHANGE THESE! As of now, the program
// is only set-up to handle these numbers:
const n = 4; // Length of secret code
const m = 6; // No. of possible colors

// HANDLING FOR GUI VERSION OF THE GAME
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
    secret:'secret',
    resave:true,
    saveUninitialized:true
}))
app.use(function(req, res, next){
    res.locals.session = req.session;
    next();
})
app.get('/', (req, res)=>{
    req.session.logTime = new Date(Date.now()).toISOString().substring(2, 23).replace(':','_').replace(':',"_");
    discard = [];
    blackGuesses = [];
    var nums = []
    // Grab a set of 4 random numbers to use as the secret code.
    var request = https.get('https://www.random.org/integers/?num=4&min=1&max=6&col=1&base=10&format=plain&rnd=new',(response)=>{
        response.on('data',(d)=>{
            nums = d.toString().split("\n");
            nums.pop();
            
        })
        response.on("close", ()=>{
            var colors = [];
            for(i=0;i<nums.length;i++){
                var n = nums[i];
                // Convert the random numbers to color hex-codes:
                colors.push(colorMap[n]);
            }
            console.log(nums) // Print the solution to the console for reference.
            var context = {};
            context.colors = colors;
            context.playerColors = []; // Array for all the available colors.
            for(var color in colorMap){
                context.playerColors.push({color:colorMap[color], name:nameMap[color]});
            }
            req.session.possibleNumbers = generatePossibleNumbers(); // Initialize list of candidate solutions.
            console.log({PossibleNumbers:req.session.possibleNumbers.length});
            req.session.scores = [];
            req.session.cfg = {guess:"", black:-1, white:-1}; // Set Current Favorite Guess to dummy value.
            res.render("home", context);
        })
    });
    request.on('error', (e) => {
        console.error(e.message);
    });
    
})

// This route is used for the "Pick a guess for me!" function of the web-based (GUI) game.
app.get('/computerGuess', (req, res)=>{
    var guess = "";
    if(req.session.cfg.black == -1){
        guess = _.sample(req.session.possibleNumbers);
    }else{
        guess = searchForGuess(req.session.cfg, req.session.possibleNumbers, req.session.scores);
    }
    res.send(guess)
})

app.post('/sendGuess', (req, res, next)=>{
    // Receives the guess & score for a round, returns the
    // adjusted list of possible numbers.
    var guess = req.body["guess"];
    var black = req.body["black"];
    var white = req.body["white"];
    for(i=0;i<guess.length;i++){
        for(var col in colorMap){
            if(guess[i] == colorMap[col]){
                guess[i] = col;
            }
        }
    }
    var guessStr = _.join(guess, '');
    if(black != 4){
        // Splice the guess from the list of possible numbers, as it didn't win.
        req.session.possibleNumbers.splice(req.session.possibleNumbers.indexOf(guessStr), 1);
    }
    if(black == 0 && white == 0){
        // Remove all guesses which contain any color from the guess:
        handleZeroScore(req.session.possibleNumbers, guessStr);
    }

    // Add that round's score to the collection of scores:
    req.session.scores.push({guess:guessStr, white:white, black:black});

    // Prune the possible solutions array based on new score information:
    handleScoreArray(req.session.possibleNumbers, req.session.scores);

    // Decide whether this is a new Current Favorite Guess:
    if((black + white) > (req.session.cfg.black + req.session.cfg.white)){
        req.session.cfg = {guess:guessStr, black:black, white:white};
    }
    else if((black + white) == (req.session.cfg.black + req.session.cfg.white)){
        if(black >= req.session.cfg.black){
            req.session.cfg = {guess:guessStr, black:black, white:white};
        }
    }

    // Send the updated list of possible numbers to the client.
    res.send(req.session.possibleNumbers);
})
app.use(function(req,res){
    res.status(404);
    res.render('404');
});
    
app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500);
    res.render('500');
});
    
app.listen(PORT, function(){
    console.log(`Listening on: http://localhost:${ PORT }; press Ctrl-C to terminate.`);
});

function handleZeroScore(arr, guess){
    // Cuts out any candidate solutions which have any
    // similarities to the 0-scoring guess:
    var mx=arr.length-1;
    while(mx >= 0){
        for(j=0;j<n;j++){
            if(arr[mx].includes(guess.charAt(j))){
                arr.splice(mx, 1);
                break;
            }
        }
        mx--;
    }
}

// END GUI-SPECIFIC FUNCTIONS

function serverSideGame(){
    var nums = [];
    // Gets a big set of random numbers for the 7 games.
    var request = https.get('https://www.random.org/integers/?num=401&min=1&max=6&col=1&base=10&format=plain&rnd=new',(response)=>{
        response.on('data',(d)=>{
            nums = d.toString().split("\n");
            nums.pop();
            console.log(nums)
            nums.shift()
        })
        response.on("close", ()=>{
            for(k=0;k<7;k++){
                discard = [];
                console.log(nums.slice((k*4), n+(k*4))); // Print the answer to the console for reference
                var arr = generatePossibleNumbers(); // Generate initial list of possible solutions.
                var cx = 0;
                var scores = []; // Array for past scores.
                while(arr.length > 0){
                    if(cx == 0 || (score.black + score.white == 0)){
                        // On the first round, or if last guess was completely unsuccessful,
                        // pick a new, random guess.
                        var guess = _.sample(arr);
                    } else{
                        guess = searchForGuess(cfg, arr, scores);
                    }
                    // Score the guess agains the answer:
                    var score = getScore(guess.split(''), nums.slice((k*4), n+(k*4)));
                    console.log(score); // Log last rounds score for reference.
                    if(cx == 0){
                        var cfg = {guess:score.guess, black:score.black, white:score.white};
                    }
                    if(score.black != 4){
                        if(arr.indexOf(guess) != -1){
                            arr.splice(arr.indexOf(guess), 1);
                        }
                        
                    }else{ // black == 4:
                        console.log("Winner!");
                        console.log("Guesses to win: ")
                        console.log(cx+1); // Number of guesses it took 
                        break;
                    }
                    if(score.black == 0 && score.white == 0){
                            // Cuts out any candidate solutions which have any
                            // similarities to the 0-scoring guess:
                        var mx=arr.length-1;
                        while(mx >= 0){
                            for(j=0;j<n;j++){
                                if(arr[mx].includes(guess.charAt(j))){
                                    arr.splice(mx, 1);
                                    break;
                                }
                            }
                            mx--;
                        }
                    }
                    scores.push(score);
                    // Prune the array of solutions given the new information:
                    handleScoreArray(arr, scores);
                    // Handle assigning the new Current Favorite Guess:
                    if((score.black + score.white) > (cfg.black + cfg.white)){
                        cfg = score;
                    }
                    else if((score.black + score.white) == (cfg.black + cfg.white)){
                        if(score.black >= cfg.black){
                            cfg = score
                        }
                    }
                    console.log("Current favorite guess:"); // Log current favorite guess to console.
                    console.log(cfg);
                    addTo(arr); // Prints the array 
                    cx += 1;
                }

            }
        })
    })
}

function addTo(arr){
    // Originally for logging purposes, now just prints the remaining candidate solution array.
    console.log("===Possible solutions array===");
    console.log(arr);
    console.log("------------------------------")
}

function getScore(guess, answer){
    // Calculates the score for a given guess/answer
    var correct = 0;
    for(i=0;i<answer.length;i++){
        if(answer[i] == guess[i]){
            correct += 1;
        }
    };
    var guessColors = {}; // User's guess by color
    var gameColors = {}; // Answer by color
    for(i=1;i<=m;i++){
        guessColors[i] = 0;
        gameColors[i] = 0;
    };
    for(x=0;x<guess.length;x++){
        var d = guessColors[guess[x]];
        d += 1;
        guessColors[guess[x]] = d;         
    }
    
    for(x=0;x<answer.length;x++){
        var c = gameColors[answer[x]];
        c += 1;
        gameColors[answer[x]] = c;
    };
    // White calculated by formula found here: https://mathworld.wolfram.com/Mastermind.html
    // ====
    var sum = 0;
    for(var x in gameColors){
        sum += Math.min(gameColors[x], guessColors[x]);
    }
    var white = sum - correct;
    // ====
    var black = correct;
    return {guess:guess.join(""), white:white, black:black};
}

function generatePossibleNumbers(){
    // Generates possible numbers for a 4-position, 6-color game.
    var g = [];
    for(i=1111;i<=6666;i++){
        if(i % 10 < 7 && i % 100 < 70 && i % 1000 < 700 && !(i.toString().includes("0"))){
            g.push(i.toString());
        }
        
    }
    return g;
}

function searchForGuess(cfg, arr, scores){
    // Finds a new candidate guess, and tests if it's a viable candidate by checking it against 
    // all past guesses.
    var isCandidate = false;
    while(!(isCandidate)){
        var newGuess = generateNewGuess(cfg, arr);
        if(processGuess(newGuess, scores) == true){
            isCandidate = true;
        }
    }
    return newGuess;
}

function generateNewGuess(cfg, arr){
    var cfgArr = cfg.guess.split(''); // Turn CFG string into array
    var arrCopy = _.clone(arr); // Clone candidate array so original isn't modified
    var fx = arrCopy.length-1;
    while(fx >= 0){
        var sample = _.sample(arrCopy);
        var candidate = sample.split('');
        var cancopy = _.clone(candidate); // Clone the current candidate as we'll be splicing it.
        var checkArr = [];
        var idx = arrCopy.indexOf(sample)
        var black = 0;
        var white = 0;
        // Count black and white pegs for the candidate guess vs.
        // the Current Favorite Guess (CFG).
        for(x=0;x<n;x++){
            if(cfgArr[x] == candidate[x]){
                black += 1;
                cancopy.splice(cancopy.indexOf(cfgArr[x]), 1);
            } else{
                checkArr.push(cfgArr[x]);
            }
        }
        for(x=0;x<checkArr.length;x++){
            canidx = cancopy.indexOf(checkArr[x])
            if(canidx != -1){
                white += 1;
                cancopy.splice(canidx, 1)
            }

        } 
        // If the scores are the same, return that guess.
        if(cfg.black == black && cfg.white == white){
            return arrCopy[idx]
        } else{
            // Otherwise remove that guess and move on.
            fx--;
            arrCopy.splice(idx, 1);
        }
    }
}


function handleScoreArray(nums, scores){
    // Splices any non-conforming numbers from the possible
    // solution list.
    var cx=nums.length-1;
    while(cx >= 0){
        // If candidate solution's scores don't agree with scores for
        // past guesses, cut that candidate solution out of the running:
        if(processGuess(nums[cx], scores) == false){
            nums.splice(cx, 1);
        }
        cx--;
    }
}

function processGuess(new_guess, scores){
    // Determines whether a candidate guess is consistent with past solutions.
    for(mp=0;mp<scores.length;mp++){
        var new_score = getScore(new_guess.split(''), scores[mp].guess.split(''));
        if(new_score.black != scores[mp].black && new_score.white != scores[mp].white){
            return false;
        }
    }
    return true;
}

serverSideGame();
