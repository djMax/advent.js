var cards = [];

var suits = ['Hearts', 'Spades', 'Diamonds', 'Clubs'];
var values = ['Ace', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'Jack', 'Queen', 'King'];

for (var s = 0; s < suits.length; s++) {
    for (var v = 0; v < values.length; v++) {
        cards.push({
            value: values[v],
            suit: suits[s]
        });
    }
}

function pickACard() {
    while (true) {
        var tryCard = parseInt(Math.random() * 52);
        if (cards[tryCard].used !== true) {
            cards[tryCard].used = true;
            return tryCard;
        }
    }
}

function scoreCard(card, aceLow) {
    if (card.value === 'Ace') {
        if (aceLow) {
            return 1;
        }
        return 11;
    }
    if (card.value === 'Jack' || card.value === 'King' || card.value === 'Queen') {
        return 10;
    }
    return card.value;
}

function scoreHand(hand, aceLow) {
    var score = 0;
    for (var i = 0; i < hand.length; i++) {
        score = score + scoreCard(cards[hand[i]], aceLow);
    }
    // If we busted, make sure we try to score with ace low instead
    if (score > 21 && !aceLow) {
        return scoreHand(hand, true);
    }
    return score;
}

function printHand(hand) {
    var handString = '';
    for (var i = 0; i < hand.length; i++) {
        handString = handString + ' ' + cards[hand[i]].value + '/' + cards[hand[i]].suit;
    }
    print(handString);
}

async
function run() {
    while (true) {
        var hand = [];
        hand.push(pickACard());
        hand.push(pickACard());

        while (true) {
            printHand(hand);
            var score = scoreHand(hand);
            print('Your score is: ' + score);
            if (score > 21) {
                print('BUSTED!!!! YOU LOSE');
                computer
                break;
            } else if (score === 21) {
                print('You won! W00t W00t!');
                break;
            }

            print('Do you want to Hit or Stay?');
            var which = await
            readLine();
            if (which.toLowerCase() === 'hit') {
                hand.push(pickACard());
            } else {
                break;
            }
        }

        print('Your final score is: ' + scoreHand(hand));

        print('Play Again (Yes/No)?');

        var again = await
        readLine();
        if (again.toLowerCase() !== 'yes') {
            print('Game Over');
            return;
        }

    }
}

run();
