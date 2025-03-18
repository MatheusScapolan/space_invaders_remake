// configuração do jogo Phaser 
var config = {
    type: Phaser.AUTO, // usa WebGL se disponível, senão usa Canvas
    width: 800, // largura da tela do jogo
    height: 600, // altura da tela do jogo 
    physics: {
        default: 'arcade', // usa o motor de física arcade do Phaser
        arcade: {
            gravity: { y: 0 }, // sem gravidade, pois é um jogo de tiro espacial
            debug: false // desativa a exibição da depuraçaõ da física
        }
    },           
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
        },

    scene: {
        preload: preload, // função de carregamento de assets
        create: create, // função de inicialização dos objetos do jogo 
        update: update // função de atualizaçaõ contínua do jogo 
    }
};

// criação do jogo Phaser com a configuração definida 
var game = new Phaser.Game(config);

// configuração dos inimigos (tamanho, quantidade e espaçamento)
enemyInfo = {
    width: 40, // largura de cada inimigo 
    height: 20, // altura de cada inimigo 
    count: {
        row: 5, // número de linhas de inimigos 
        col: 9 // número de colunas de inimigos 
    },
    offset: {
        top: 100, // distância do topo da tela 
        left: 60 // distância da esquerda da tela
    },
    padding: 5 // espaçamento entre inimigos 
};

// sons do jogo usando Howler.js
var move = new Howl({
    src: ['assets/move.mp3']
}); // som do movimento dos inimigos 

var shootSound = new Howl({
    src: ['assets/shoot.mp3']
}); // som do tiro 

var explosionSound = new Howl({
    src: ['assets/explosion.mp3']
}); // som de explosão

var saucerSound = new Howl({
    src: ['assets/saucer.mp3'],
    loop: true
}); // som do disco voador (loop infinito)


// função para carregar assets antes do jogo começar 
function preload() {
    this.load.image("stars", "assets/stars.png") // carrega imagem do 
    this.load.image("shooter", "assets/cannon.png") // carrega imagem do canhão 
    this.load.image("alien", "assets/enemy.svg") // carrega imagem dos inimigos 
    this.load.image("bullet", "assets/bullet.svg") // carrega imagem do projétil
    this.load.image("saucer", "assets/saucer.svg") // carrega imagem do disco voador 
}

// variáveis globais do jogo
var score = 0; // pontuação inicial 
var lives = 3; // número de vidas 
var isStarted = false; // estado do jogo (se começou ou não)
var barriers = []; // lista para armazenar as barreiras 
var ufoCount = 0; // contador de discos voadores destruidos 

// função para criar elementos do jogo 
function create() {
    scene = this; // define o contexto da cena atual 
    background = this.add.tileSprite(0, 0, 800, 600, "stars").setOrigin(0, 0); // ddiciona o fundo como um tileSprite para cobrir toda a tela
    cursors = scene.input.keyboard.createCursorKeys(); // criação dos controles
    keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A); // adiciona a tecla 'A' como controle 
    keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D); // adiciona a tecla 'D' como controle
    isShooting = false; // define que o jogador não está atirando inicialmente 
    this.input.keyboard.addCapture('SPACE'); // impede que a tecla 'SPACE' tenha ações padrão do navegador
    enimies = this.physics.add.staticGroup(); // cria um grupo estático para os inimigos

    // criar limites invisíveis para detectar colisões
    playerLava = scene.add.rectangle(0, 0, 800, 10, 0x000).setOrigin(0) // limite superior
    enemyLava = scene.add.rectangle(0, 590, 800, 10, 0x000).setOrigin(0) // limite inferior
    saucerLava = scene.add.rectangle(790, 0, 10, 600, 0x000).setOrigin(0) // limite lateral direito
    scene.physics.add.existing(playerLava)  // adiciona física ao limite superior
    scene.physics.add.existing(enemyLava) // adiciona física ao limite inferior
    scene.physics.add.existing(saucerLava)  // adiciona física ao limite lateral direito

    // criar jogador
    shooter = scene.physics.add.sprite(400, 560, 'shooter'); // adiciona o jogador na posição inicial
    shooter.setCollideWorldBounds(true) // impede que o jogador saia da tela

    scoreText = scene.add.text(16, 16, "Pontuação: " + score, { fontSize: '18px', fill: '#FFF' }) // exibe o placar
    livesText = scene.add.text(696, 16, "Vidas: " + lives, { fontSize: '18px', fill: '#FFF' }) // exibe as vidas
    startText = scene.add.text(400, 300, "Clique para Jogar", { fontSize: '18px', fill: '#FFF' }).setOrigin(0.5) // exibe a mensagem de início

    this.input.keyboard.on('keydown-SPACE', shoot); // associa a tecla 'SPACE' à função de disparo

    // criar barreiras protetoras
    barriers.push(new Barrier(scene, 50, 450)) // adiciona barreira na esquerda
    barriers.push(new Barrier(scene, 370, 450)) // adiciona barreira no centro
    barriers.push(new Barrier(scene, 690, 450)) // adiciona barreira na direita

    // iniciar jogo ao clicar na tela
    this.input.on('pointerdown', function () { 
        if (isStarted == false) { // se o jogo ainda não começou
            isStarted = true;
            startText.destroy() // remove o texto inicial "Clique para Jogar"
            setInterval(makeSaucer, 15000) // gera um disco voador a cada 15 segundos

        } else {
            shoot() // dispara ao clicar
        }
    });
    initEnemys() // inicializa os inimigos na tela
}

// função para atualizar o jogo a cada frame
function update() {
    if (isStarted == true) {
        if (cursors.left.isDown || keyA.isDown) {
            shooter.setVelocityX(-160); // move o jogador para a esquerda

        }
        else if (cursors.right.isDown || keyD.isDown) {
            shooter.setVelocityX(160); // move o jogador para a direita

        }
        else {
            shooter.setVelocityX(0); // para o jogador se nenhuma tecla for pressionada

        }
    }
}

// função para disparar tiros
function shoot() {
    if (isStarted == true) {
        if (isShooting === false) {
            manageBullet(scene.physics.add.sprite(shooter.x, shooter.y, "bullet")) // cria a bala na posição do jogador
            isShooting = true;
            shootSound.play() // toca som de tiro
        }
    }
}

// função para inicializar os inimigos na tela 
function initEnemys() {
    for (c = 0; c < enemyInfo.count.col; c++) { // loop pelas colunas dos inimigos 
        for (r = 0; r < enemyInfo.count.row; r++) { // loop pelas linhas de inimigos
            var enemyX = (c * (enemyInfo.width + enemyInfo.padding)) + enemyInfo.offset.left; // calcula a posição X do inimigo com base na coluna
            var enemyY = (r * (enemyInfo.height + enemyInfo.padding)) + enemyInfo.offset.top; // calcula a posição Y do inimigo com base na linha
            enimies.create(enemyX, enemyY, 'alien').setOrigin(0.5); // cria o inimigo na posição determinada e define a origem centralizada
        }
    }
}

setInterval(moveEnimies, 1000)  // chama a função moveEnimies() a cada 1 segundo
var xTimes = 0; // contador do deslocamento horizontal dos inimigos
var yTimes = 0; // contador do deslocamento vertical dos inimigos (não utilizado aqui)
var dir = "right" // direção inicial dos inimigos

// função para mover os inimigos
function moveEnimies() { 
    if (isStarted === true) { // verifica se o jogo está iniciado
        move.play() // reproduz o som de movimento dos inimigos
        if (xTimes === 20) { // se os inimigos se moveram 20 vezes em uma direção, inverte a direção
            if (dir === "right") { // se estavam indo para a direita
                dir = "left" // muda para a esquerda
                xTimes = 0 // reseta o contador
            } else { // se estavam indo para a esquerda
                dir = "right" // muda para a direita
                xTimes = 0 // reseta o contador
            }
        }
        if (dir === "right") { // se a direção for para a direita
            enimies.children.each(function (enemy) { // Itera sobre cada inimigo

                enemy.x = enemy.x + 10;  // move o inimigo 10 pixels para a direita
                enemy.body.reset(enemy.x, enemy.y); // atualiza a posição do corpo físico

            }, this);
            xTimes++; // incrementa o contador de deslocamento
        } else {  // se a direção for para a esquerda
            enimies.children.each(function (enemy) { // itera sobre cada inimigo

                enemy.x = enemy.x - 10; // move o inimigo 10 pixels para a esquerda
                enemy.body.reset(enemy.x, enemy.y); // atualiza a posição do corpo físico

            }, this);
            xTimes++; // incrementa o contador de deslocamento

        }
    }
}

// gerencia o comportamento da bala disparada pelo jogador
function manageBullet(bullet) {
    bullet.setVelocityY(-480); // define a velocidade vertical da bala para cima

    var i = setInterval(function () { // cria um intervalo para verificar colisões
        enimies.children.each(function (enemy) { // itera sobre cada inimigo

            if (checkOverlap(bullet, enemy)) { // verifica se a bala colidiu com um inimigo
                bullet.destroy(); // destroi a bala
                clearInterval(i) // para a verificação da colisão
                isShooting = false // define que o jogador pode atirar novamente
                enemy.destroy() // destroi o inimigo
                score++; // incrementa a pontuação
                scoreText.setText("Pontuação: " + score); // atualiza a pontuação na tela

                explosionSound.play() // toca o som de explosão

                if ((score - ufoCount) === (enemyInfo.count.col * enemyInfo.count.row)) { // se todos os inimigos foram destruídos
                    end("Ganhou!") // finaliza o jogo com vitória
                }
            }

// verifica colisão com barreiras
        }, this);
        for (var step = 0; step < barriers.length; step++) {
            if (barriers[step].checkCollision(bullet)) { // se a bala colidir com uma barreira
                bullet.destroy(); // destroi a bala
                clearInterval(i) // para a verificação da colisão
                isShooting = false // permite que o jogador atire novamente

                scoreText.setText("Pontuação: " + score); // atualiza o placar


                explosionSound.play() // toca o som de explosão

                if ((score - ufoCount) === (enemyInfo.count.col * enemyInfo.count.row)) { // se todos os inimigos foram destruídos
                    end("Ganhou!") // finaliza o jogo com vitória
                }
            }
        }

// verifica colisão com discos voadores
        for (var step = 0; step < saucers.length; step++) {
            var saucer = saucers[step]; // obtém um disco voador
            if (checkOverlap(bullet, saucer)) { // se a bala colidir com o disco voador
                bullet.destroy(); // destroi a bala
                clearInterval(i) // para a verificação da colisão
                isShooting = false // permite que o jogador atire novamente

                scoreText.setText("Pontuação: " + score); // atualiza o placar


                explosionSound.play()  // toca o som de explosão

                if ((score - ufoCount) === (enemyInfo.count.col * enemyInfo.count.row)) { // se todos os inimigos foram destruídos
                    end("Ganhou") // finaliza o jogo com vitória
                }

                saucer.destroy() // destroi o disco voador
                saucer.isDestroyed = true; // marca o disco voador como destruído
                saucerSound.stop(); // para o som do disco voador
                score++; // incrementa a pontuação
                ufoCount++; // incrementa o contador de discos voadores destruídos
            }
        }
    }, 10)

// verifica se a bala saiu da tela
    scene.physics.add.overlap(bullet, playerLava, function () {
        bullet.destroy(); // destroi a bala
        clearInterval(i); // para a verificação
        explosionSound.play(); // toca o som de explosão
        isShooting = false // permite que o jogador atire novamente
    })

}
// define a velocidade inicial dos tiros dos inimigos
var enemyBulletVelo = 200;

// gerencia a bala disparada pelo inimigo
function manageEnemyBullet(bullet, enemy) {
    var angle = Phaser.Math.Angle.BetweenPoints(enemy, shooter); // calcula o ângulo entre o inimigo e o jogador
    scene.physics.velocityFromRotation(angle, enemyBulletVelo, bullet.body.velocity); // define a direção da bala
    enemyBulletVelo = enemyBulletVelo + 2 // aumenta a velocidade do tiro a cada disparo
    var i = setInterval(function () {

        if (checkOverlap(bullet, shooter)) { // se a bala atingir o jogador
            bullet.destroy(); // destroi a bala
            clearInterval(i); // para a verificação
            lives--; // diminui a vida do jogador
            livesText.setText("Vidas: " + lives); // atualiza a exibição de vidas
            explosionSound.play() // toca o som de explosão

            if (lives == 0) { // se o jogador ficar sem vidas
                end("Perdeu!") // finaliza o jogo com derrota
            }
        }

        for (var step = 0; step < barriers.length; step++) { // verifica colisão com barreiras
            if (barriers[step].checkCollision(bullet)) { // se a bala atingir uma barreira
                bullet.destroy(); // destroi a bala
                clearInterval(i) // para a verificação
                isShooting = false  // permite que o jogador atire novamente

                scoreText.setText("Pontuação: " + score); // atualiza o placar


                explosionSound.play() // toca o som de explosão

                if (score === (enemyInfo.count.col * enemyInfo.count.row)) { // se todos os inimigos foram destruídos
                    end("Ganhou!") // finaliza o jogo com vitória
                }
            }
        }
    }, 10)

    // verifica se a bala do inimigo saiu da tela
    scene.physics.add.overlap(bullet, enemyLava, function () {
        bullet.destroy(); // destroi a bala
        explosionSound.play(); // toca o som de explosão
        clearInterval(i); // para a verificação
    })
}

// função para verificar se dois sprites estão sobrepostos
function checkOverlap(spriteA, spriteB) { 
    var boundsA = spriteA.getBounds(); // obtém os limites do primeiro sprite
    var boundsB = spriteB.getBounds(); // obtém os limites do segundo sprite
    return Phaser.Geom.Intersects.RectangleToRectangle(boundsA, boundsB); // retorna verdadeiro se houver interseção entre os retângulos
}

// configura um intervalo para os inimigos dispararem tiros a cada 3 segundos
setInterval(enemyFire, 3000)

// função para fazer um inimigo atirar
function enemyFire() {
    if (isStarted === true) { // verifica se o jogo já foi iniciado
        var enemy = enimies.children.entries[Phaser.Math.Between(0, enimies.children.entries.length - 1)]; // escolhe um inimigo aleatório
        manageEnemyBullet(scene.physics.add.sprite(enemy.x, enemy.y, "bullet"), enemy) // faz o inimigo atirar
    }
}

// lista para armazenar os discos voadores
var saucers = [];

// função para criar um novo disco voador
function makeSaucer() {
    if (isStarted == true) { // verifica se o jogo está rodando
        manageSaucer(scene.physics.add.sprite(0, 60, "saucer")); // adiciona um disco voador na posição inicial
    }
}

// configura um intervalo para os discos voadores atirarem a cada 2 segundos
setInterval(function () {
    if (isStarted == true) { // verifica se o jogo está ativo
        for (var i = 0; i < saucers.length; i++) { // percorre todos os discos voadores
            var saucer = saucers[i];
            if (saucer.isDestroyed == false) { // se o disco voador não foi destruído
                manageEnemyBullet(scene.physics.add.sprite(saucer.x, saucer.y, "bullet"), saucer) // faz o disco voador atirar

            } else {
                saucers.splice(i, 1); // remove o disco voador da lista se ele foi destruído
            }
        }
    }
}, 2000)

// função para gerenciar o comportamento do disco voador
function manageSaucer(saucer) { 
    saucers.push(saucer); // adiciona o disco voador na lista
    saucer.isDestroyed = false; // define que o disco voador está ativo
    saucer.setVelocityX(100); // define a velocidade do disco voador
    scene.physics.add.overlap(saucer, saucerLava, function () { // verifica se o disco voador colidiu com a borda
        saucer.destroy() // destroi o disco voador
        saucer.isDestroyed = true; // marca como destruído
        saucerSound.stop() // para o som do disco voador
    })
    saucerSound.play() // para o som do disco voador
}

// classe para criar barreiras protetoras
class Barrier {
    constructor(scene, gx, y) {
        var x = gx; // define a coordenada X inicial
        var y = y; // define a coordenada Y inicial
        this.children = []; // lista de blocos da barreira
        this.scene = scene; // cena do jogo

        for (var r = 0; r < 3; r++) { // cria 3 linhas
            for (var c = 0; c < 3; c++) { // cria 3 colunas
                var child = scene.add.rectangle(x, y, 30, 20, 0x1ff56); // cria um bloco da barreira
                scene.physics.add.existing(child); // adiciona física ao bloco
                child.health = 2; // define a vida do bloco
                this.children.push(child) // adiciona o bloco à lista
                x = x + child.displayWidth; // move a posição X para o próximo bloco
            }
            x = gx; // reinicia a coordenada X para a próxima linha
            y = y + child.displayHeight; // move a posição Y para a próxima linha
        }
        this.children[this.children.length-2].destroy(); // remove um bloco central da barreira
        this.children.splice(this.children.length-2, 1); // remove o bloco da lista        
    }

    // verifica se um sprite colidiu com a barreira
    checkCollision(sprite) {
        var isTouching = false; // define que inicialmente não há colisão
        for (var i = 0; i < this.children.length; i++) { // percorre todos os blocos da barreira
            var child = this.children[i]; // obtém um bloco
            if (checkOverlap(sprite, child)) { // se houver colisão
                isTouching = true; // marca como verdadeiro

                if (this.children[i].health === 1) { // se o bloco tiver apenas 1 ponto de vida restante
                    child.destroy(); // destroi o bloco
                    this.children.splice(i, 1); // remove da lista

                } else {
                    this.children[i].health--; // reduz a vida do bloco
                }
                break;
            }
        }
        return isTouching; // retorna se houve colisão
    }
}

// função para finalizar o jogo
function end(con) {
    explosionSound.stop(); // para o som de explosão
    saucerSound.stop(); // para o som do disco voador
    shootSound.stop(); // para o som do tiro
    move.stop() // para o som de movimento dos inimigos
    alert(`Você ${con}! Pontuação: ` + score); // exibe a mensagem de fim de jogo
    location.reload()// recarrega a página para reiniciar o jogo
}