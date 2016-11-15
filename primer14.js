var http = require("http").createServer(handler); // handler za delo z aplikacijo
var io = require("socket.io").listen(http); // socket.io za trajno povezavo med strež. in klient.
var fs = require("fs"); // spremenljivka za "file system", t.j. fs
var firmata = require("firmata"); // da so pini na Arduinu dostopni preko USB

function handler(req, res) {
    fs.readFile(__dirname + "/primer14.html",
    function (err, data){
        if (err) {
            res.writeHead(500, {"Content-Type": "text/plain"});
            return res.end("Napaka pri nalaganju html strani");
        }
    res.writeHead(200);
    res.end(data);
    })
}

// PID algoritem
var odstopanje = new Array(); // polje za vrednosti napak (error)
odstopanje[0] = 0;
odstopanje[1] = 1;
odstopanje[2] = 2;

var Kp = 0.5; // proporcionalni količnik
var Ki = 0.015; // integralni količnik
var Kd = 0.25; // diferencialni količnik

pwm = 0;

var želenaVrednost = 0; // nastavimo želeno vrednost na 0
var dejanskaVrednost = 0; // spremenljivka za dejansko vrednost
var faktor = 0.25; // faktor, ki dololoča hitrost doseganja žel. stan.

http.listen(8080); // določimo na katerih vratih bomo poslušali

console.log("Zagon sistema"); // v konzolo zapišemo sporočilo (v terminal)

var board = new firmata.Board("/dev/ttyUSB0", function() {
    console.log("Priključitev na Arduino");
    board.pinMode(0, board.MODES.ANALOG); // analogni pin 0
    board.pinMode(1, board.MODES.ANALOG); // analogni pin 1
    board.pinMode(2, board.MODES.OUTPUT); // smer DC motorja
    board.pinMode(3, board.MODES.PWM); // PWM motorja oz. hitrost
    board.pinMode(4, board.MODES.OUTPUT); // smer DC motorja
});

board.on("ready", function() { 

console.log("Plošča pripravljena.");

board.analogRead(0, function(value) {
    želenaVrednost = value; // neprekinjeno branje pina A0
});

board.analogRead(1, function(value) {
    dejanskaVrednost = value; // neprekinjeno branje pina A1
});

startKontrolniAlgoritem(); // poženemo kontrolni algoritem

io.sockets.on("connection", function(socket) {
    socket.emit("sporociloKlientu", "Strežnik povezan.");
    
    setInterval(pošljiVrednosti, 40, socket); // na 40ms pošljemo vrednost klientu

});
    
});

function kontrolniAlgoritem () {
    odstopanje.pop(); // odrežemo eno vrednost iz polja
    odstopanje.unshift(želenaVrednost - dejanskaVrednost);
    pwm += Kp*(odstopanje[0] - odstopanje[1]) + Ki*odstopanje[0] + Kd*(odstopanje[0] - 2*odstopanje[1] + odstopanje[2]);
    if(pwm > 255) {pwm = 255};
    if(pwm < -255) {pwm = -255};
    if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // določimo smer če je > 0
    if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // določimo smer če je < 0
    board.analogWrite(3, Math.abs(pwm));
    console.log("PWM = " + pwm);
};

function startKontrolniAlgoritem () {
    setInterval(function() {kontrolniAlgoritem(); }, 30); // na 30ms klic
    console.log("Start kontrolni algoritem")
};

function pošljiVrednosti (socket) {
    socket.emit("klientBeriVrednosti",
    {
    "želenaVrednost": želenaVrednost,
    "dejanskaVrednost": dejanskaVrednost
    });
};
