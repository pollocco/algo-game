var round = 1;
var playerColors = {0:'', 1:'', 2:'', 3:''};
var answer = Array.from(document.querySelector('.answer').children).map(x=>x.firstElementChild.firstElementChild.getAttribute("fill"));
var ballGrid = Array.from(document.querySelector('.ballGrid').children).map(x=>x.firstElementChild.firstElementChild.getAttribute("fill"));
var gameColors = {};
for(i=0;i<ballGrid.length;i++){
    gameColors[ballGrid[i]] = 0;
};
for(i=0;i<answer.length;i++){
    let c = gameColors[answer[i]];
    c += 1;
    gameColors[answer[i]] = c;
};
document.body.addEventListener('keypress', function(e){
    if((e.code.includes('Digit')|| e.code.includes('Numpad')) && (parseInt(e.code.substring(e.code.length-1)) >= 1 && parseInt(e.code.substring(e.code.length-1)) <= 6)){
        var balg = document.querySelector('.ballGrid').children;
        var getBall = balg[e.code.substring(e.code.length - 1)-1].cloneNode(true);
        if(document.querySelector('.playBoard') != null && !(document.querySelector('.playBoard').classList.contains("full"))){
            document.querySelector('.playBoard').appendChild(getBall)
            if(document.querySelector('.playBoard').children.length >= 4 && !(document.querySelector('.playBoard').classList.contains('full'))){
                document.querySelector('.playBoard').classList.add("full");
             }
        }
        
    }
    if(e.code == "Enter" || e.code == "NumpadEnter"){
        checkColors();
    }
})
var drake = dragula([document.querySelector('.board'), document.querySelector('.playBoard')],{
    accepts: function(el, target, source, sibling){
        if(target == document.querySelector('.board') && source != document.querySelector('.board')){
            document.querySelector('.playBoard').classList.remove("full");
            
            return drake.remove(el)
        }else{
            return !(document.querySelector('.playBoard').classList.contains('full')) || (source == document.querySelector('.playBoard') && target == document.querySelector('.playBoard') && document.querySelector('.playBoard').childNodes.length <= 5) 
        }
        
    },
    direction: "horizontal",
    copy: function(el, source){
        return source == document.querySelector('.board');
    },
})

drake.on('drop', (el, target, source, sibling)=>{
    if(target == document.querySelector('.playBoard') && document.querySelector('.playBoard').children.length >= 4 && !(document.querySelector('.playBoard').classList.contains('full'))){
       document.querySelector('.playBoard').classList.add("full");
    }
    if(target == document.querySelector('.playBoard') && source == document.querySelector('.playBoard') && document.querySelector('.playBoard').children.length >= 4 && !(document.querySelector('.playBoard').classList.contains('full'))){
       document.querySelector('.playBoard').classList.add("full");
    }
    if(document.querySelector('.ballGrid').classList.contains("pickUp")){
        document.querySelector('.ballGrid').classList.remove("pickUp");
    }

})

drake.on('over', (el, container, source)=>{
    if(container == document.querySelector('.board') && source == document.querySelector('.playBoard')){
        drake.remove(el)
        document.querySelector('.playBoard').classList.remove("full");
            
    }
})


drake.on('drag', (el, source)=>{
    if(source == document.querySelector('.playBoard')){
        document.querySelector('.ballGrid').classList.add("pickUp");
            
    }
})

drake.on('dragend', (el, source)=>{
    if(document.querySelector('.ballGrid').classList.contains("pickUp")){
        document.querySelector('.ballGrid').classList.remove("pickUp");
    }
})

drake.on('cancel', (el, source)=>{
    if(document.querySelector('.ballGrid').classList.contains("pickUp")){
        document.querySelector('.ballGrid').classList.remove("pickUp");
    }
})

drake.on('remove', (el, container, source)=>{
    if(source == document.querySelector('.playBoard')){
       document.querySelector('.playBoard').classList.remove("full");
    }
    if(document.querySelector('.ballGrid').classList.contains("pickUp")){
        document.querySelector('.ballGrid').classList.remove("pickUp");
    }
})
var guessForRound = {};
for(i=1;i<=10;i++){
    guessForRound[i] = false;
}
async function computerGuess(){
    if(guessForRound[round]){
        let str = guessForRound[round];
        return alert(str);
    }else{
        var url = "/computerGuess";
        const response = await fetch(url, {
            method:'GET'
        })
        response.json().then(data=>{
            let str = data;
            guessForRound[round] = data;
            alert(str);
            
        })   
    }

}

async function checkColors(){
    var marbles = document.querySelector('.playBoard').children;
    console.log(marbles)
    if(marbles.length != 4){
        return alert('Please choose your colors!')
    } else{
        currBoard = document.querySelector('.playBoard');
        for(i=0;i<currBoard.children.length;i++){
            currBoard.children[i].classList.remove("grab");
        }    
        var marbleColors = Array.from(marbles).map(x=>x.firstElementChild.firstElementChild.getAttribute("fill"));
        for(i=0;i<4;i++){
            playerColors[i] = marbleColors[i]; // playerColors = {}, marbleColors = []
        }
        var masterBoard = document.querySelector('.master');
        var currentMarble = masterBoard.firstElementChild;
        var correct = 0;
        for(i=0;i<answer.length;i++){
            if(answer[i] == playerColors[i]){
                correct += 1;
                currentMarble.firstElementChild.firstElementChild.setAttribute("fill","#333");
                currentMarble.firstElementChild.firstElementChild.setAttribute("stroke","black");
                if(correct != 4){
                    currentMarble = currentMarble.nextElementSibling;
                }
            }
        }
        var guessColors = {};
        for(i=0;i<ballGrid.length;i++){
            guessColors[ballGrid[i]] = 0;
        };
        for(let x in playerColors){
            let c = playerColors[x];
            let d = guessColors[c];
            d += 1;
            guessColors[c] = d;         
        }
        var sum = 0;
        for(let x in gameColors){
            sum += Math.min(gameColors[x], guessColors[x]);
        }
        var white = sum - correct;
        var colored = correct;
        for(i=0;i<white;i++){
            currentMarble.firstElementChild.firstElementChild.setAttribute("fill","white");
            currentMarble.firstElementChild.firstElementChild.setAttribute("stroke","black");  
            colored += 1;
            if(colored != 4){
                currentMarble = currentMarble.nextElementSibling;
            }           
        }
        var guess= []
        for(i=0;i<4;i++){
            guess.push(playerColors[i]);
        }
        console.log(guess)
        var url = "/sendGuess";
        const response = await fetch(url, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({guess:guess, black:correct, white:white})
        })
        response.json().then(data=>{
            console.log(data)
            document.getElementById("possibleAnswers").textContent = ""
            data.forEach(row=>{
                document.getElementById("possibleAnswers").textContent += (" " + row + " ") 
            })
            
        })
        if(correct == 4){
            alert("You win! Refresh the page to play again.")
            drake.destroy();
        }

        else if(round < 10){
            round += 1;
            document.getElementById("roundNumber").textContent = round;
            currBoard = document.querySelector('.playBoard');
            currBoard.nextElementSibling.classList.add('playBoard');
            currBoard.classList.remove('playBoard');
            currBoard.classList.add('bg-light-gray');
            currBoard.classList.add('o-80');
            masterBoard.nextElementSibling.classList.add('master');
            masterBoard.classList.remove('master');
            drake.containers = [document.querySelector('.board'), document.querySelector('.playBoard')]
        } else{
            alert("You lose! Game over!")
            drake.destroy();
        }

    }


}