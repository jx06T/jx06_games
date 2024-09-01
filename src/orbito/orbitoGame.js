let game
let checkerboard = [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]]
let checkerboard_object = [[], [], [], []]

class LoadScene extends Phaser.Scene {
    constructor() {
        super({
            key: "LOAD"
        })
    }
    init() {
        // Mystate = 1
    }
    loadImages() {
        this.load.image("chessboard", './image/big_chessboard.png');
        this.load.image("black", './image/B.png');
        this.load.image("white", './image/W.png');
        this.load.image("button", './image/button.png');
    }

    preload() {
        this.add.text(-50, -50, '3', {
            fontFamily: 'Pacifico',
            fontSize: '1px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(2);

        //create loading bar
        this.loadImages()
        let loadingBar = this.add.graphics({
            fillStyle: {
                color: 0xffffff
            }
        })

        this.load.on("progress", (percent) => {
            loadingBar.fillRect(0, this.game.renderer.height / 2 - 25, this.game.renderer.height * percent, 50);
        })

        this.load.on("complete", () => {
            loadingBar.destroy()
        });

        this.load.on("load", (file) => {
            // console.log(file.key)
        })

    }
    create() {
        this.scene.start("GAME");
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({
            key: "GAME",
        });
    }
    init(data) {
        socket.on('pieceRotated', (newCheckerboard) => {
            console.log("!")
            checkerboard = newCheckerboard
            this.rotatePiece()
        })

        socket.on('pieceMoved', (newCheckerboard, x, y, nx, ny, color) => {
            console.log("!???")
            this.movePiece_animation(checkerboard_object[y][x], nx, ny)
            checkerboard_object[ny][nx] = checkerboard_object[y][x]
            checkerboard_object[y][x] = null
            checkerboard = newCheckerboard
        })

        socket.on('piecePut', (newCheckerboard, x, y, type) => {
            console.log("DD")
            checkerboard = newCheckerboard
            if (type == MyColor) {
                return
            }
            this.OtherMovingPieces(type, x, y)
        })
    }

    create() {
        this.animatingPieces = [];
        this.BPieces = [];
        this.WPieces = [];

        this.graphics = this.add.graphics().setDepth(100);

        this.hint = this.add.text(600, 50, "Move opponent's pieces", {
            fontFamily: 'Pacifico',
            fontSize: '42px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.identity = this.add.text(MyColor == 0 ? 200 : 1000, 50, "you", {
            fontFamily: 'Pacifico',
            fontSize: '42px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.check = this.add.text(600, 850, "skip", {
            fontFamily: 'Pacifico',
            fontSize: '42px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive();

        this.check.on("pointerover", () => {
            if (Mystate != 1) {
                return
            }
            this.check.setScale(1.05)
        })

        this.check.on("pointerout", () => {
            if (Mystate != 1) {
                return
            }
            this.check.setScale(1)
        })

        this.check.on("pointerup", () => {
            if (Mystate != 1) {
                return
            }
            Mystate += 1
            socket.emit('skipMovePiece');
            console.log("ch")
        })

        this.add.image(600, 450, 'chessboard').setOrigin(0.5).setScale(1.1);

        this.button = this.add.sprite(600, 450, 'button').setOrigin(0.5).setScale(1.3).setInteractive();
        this.button.on("pointerover", () => {
            if (Mystate != 3) {
                return
            }
            this.button.setScale(1.5)
        })

        this.button.on("pointerout", () => {
            if (Mystate != 3) {
                return
            }
            this.button.setScale(1.3)
        })

        this.button.on("pointerup", () => {
            if (Mystate != 3) {
                return
            }
            console.log("rr")
            socket.emit('rotatePiece');
            Mystate = 0
            this.rotatePiece()
        })



        // Create black pieces
        for (let i = 0; i < 8; i++) {
            let blackPiece = this.add.sprite(80 + Math.floor(i / 4) * 80, 100 + Math.floor(i / 4) * 100 + (i % 4) * 200, 'black').setOrigin(0.5).setScale(1.1).setInteractive();
            blackPiece.setData('color', 0)
            this.input.setDraggable(blackPiece);
            this.BPieces.push(blackPiece)
        }

        // Create white pieces
        for (let i = 0; i < 8; i++) {
            let whitePiece = this.add.sprite(1120 - Math.floor(i / 4) * 80, 100 + Math.floor(i / 4) * 100 + (i % 4) * 200, 'white').setOrigin(0.5).setScale(1.1).setInteractive();
            whitePiece.setData('color', 1)
            this.input.setDraggable(whitePiece);
            this.WPieces.push(whitePiece)
        }

        this.InitializeChessboard()

        // Drag and drop functionality
        this.input.on('dragstart', (pointer, gameObject) => {
            if (!this.canMoved(gameObject)) {
                return
            }
            gameObject.setScale(1.2);
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.canMoved(gameObject)) {
                return
            }

            if (Mystate == 1) {
                this.checkPieceMoving(dragX, dragY, gameObject)
            } else {
                this.checkPiecePutting(dragX, dragY, gameObject)
            }

            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        this.input.on('dragend', (pointer, gameObject) => {
            if (!this.canMoved(gameObject)) {
                return
            }
            gameObject.setScale(1.1);
            const finalX = gameObject.x;
            const finalY = gameObject.y;

            if (Mystate == 1) {
                this.movePiece(finalX, finalY, gameObject)
            } else {
                this.putPiece(finalX, finalY, gameObject)
            }
        });
        // this.scene.launch('DebugScene')
    }

    movePiece_animation(gameObject, x, y) {
        gameObject.setData('ox', x);
        gameObject.setData('oy', y);
        gameObject.setData('targetX', this.convertX(x));
        gameObject.setData('targetY', this.convertY(y));
        gameObject.setData('startX', gameObject.x);
        gameObject.setData('startY', gameObject.y);
        gameObject.setData('moveProgress', 0);

        this.animatingPieces.push(gameObject);
    }

    convertX(x) {
        return 145 * x + 380
    }

    convertY(y) {
        return 145 * y + 230
    }

    OtherMovingPieces(type, x, y) {
        if (type == 0) {
            const BP = this.BPieces.shift()
            this.movePiece_animation(BP, x, y)
            BP.setData('state', 1)
            checkerboard_object[y][x] = BP
        } else {
            const WP = this.WPieces.shift()
            this.movePiece_animation(WP, x, y)
            WP.setData('state', 1)
            checkerboard_object[y][x] = WP
        }
    }

    InitializeChessboard() {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (checkerboard[i][j] != -1) {
                    console.log(checkerboard[i][j])
                    this.OtherMovingPieces(checkerboard[i][j], j, i)
                }
            }
        }
    }

    canMoved(gameObject) {
        if (Mystate == 0) {
            return false
        }
        if (Mystate == 1 && (gameObject.getData('color') == MyColor || gameObject.getData('state') != 1)) {
            return false
        }
        if (Mystate == 2 && (gameObject.getData('color') != MyColor || gameObject.getData('state') == 1)) {
            return false
        }
        if (Mystate == 3) {
            return false
        }
        return true
    }

    putPiece(finalX, finalY, gameObject) {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const centerX = this.convertX(j)
                const centerY = this.convertY(i)
                if (Math.abs(finalX - centerX) < 73 && Math.abs(finalY - centerY) < 73) {
                    if (checkerboard[i][j] != -1) {
                        this.movePiece_animation(gameObject, gameObject.getData('color') * 6.5 + -1.75, i)
                        return
                    }
                    gameObject.x = centerX
                    gameObject.y = centerY
                    checkerboard[i][j] = gameObject.getData('color')
                    checkerboard_object[i][j] = gameObject
                    gameObject.setData('state', 1)

                    gameObject.setData('ox', j)
                    gameObject.setData('oy', i)

                    console.log(checkerboard, "99", Mystate)
                    Mystate += 1
                    socket.emit('putPiece', j, i);
                    return
                }
            }
        }
    }

    checkPiecePutting(finalX, finalY, gameObject) {
        this.graphics.clear();
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const centerX = this.convertX(j)
                const centerY = this.convertY(i)
                if (Math.abs(finalX - centerX) < 73 && Math.abs(finalY - centerY) < 73) {
                    if (checkerboard[i][j] != -1) {
                        this.graphics.fillStyle(0xff0000, 0.3);
                        this.graphics.fillRect(centerX - 72, centerY - 72, 145, 145);
                    }
                    return
                }
            }
        }
    }

    movePiece(finalX, finalY, gameObject) {
        const ox = gameObject.getData('ox')
        const oy = gameObject.getData('oy')
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const centerX = this.convertX(j)
                const centerY = this.convertY(i)
                if (Math.abs(finalX - centerX) < 73 && Math.abs(finalY - centerY) < 73) {
                    if (checkerboard[i][j] != -1 || Math.abs(oy - i) > 1 || Math.abs(ox - j) > 1 || (Math.abs(oy - i) == 1 && Math.abs(ox - j) == 1)) {
                        this.movePiece_animation(gameObject, ox, oy)
                        return
                    }
                    gameObject.x = centerX
                    gameObject.y = centerY

                    checkerboard[oy][ox] = -1
                    checkerboard[i][j] = gameObject.getData('color')
                    checkerboard_object[oy][ox] = null
                    checkerboard_object[i][j] = gameObject

                    gameObject.setData('state', 1)
                    console.log(checkerboard, checkerboard_object, "909", Mystate)
                    Mystate += 1
                    socket.emit('movePiece', ox, oy, j, i);
                    return
                }
            }
        }
    }

    checkPieceMoving(finalX, finalY, gameObject) {
        const ox = gameObject.getData('ox')
        const oy = gameObject.getData('oy')
        this.graphics.clear();
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const centerX = this.convertX(j)
                const centerY = this.convertY(i)
                if (Math.abs(finalX - centerX) < 73 && Math.abs(finalY - centerY) < 73) {
                    if (checkerboard[i][j] != -1 || Math.abs(oy - i) > 1 || Math.abs(ox - j) > 1 || (Math.abs(oy - i) == 1 && Math.abs(ox - j) == 1)) {
                        this.graphics.fillStyle(0xff0000, 0.3);
                        const size = 100; // 正方形边长
                        this.graphics.fillRect(centerX - 72, centerY - 72, 145, 145);
                    }
                    return
                }
            }
        }
    }

    rotationMatrix(matrix) {
        const n = matrix.length;
        const rotatedMatrix = [];

        for (let i = 0; i < n; i++) {
            rotatedMatrix.push([]);
        }

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const t = this.getPreviousCoordinate(i, j)
                // console.log(i, j, t)
                rotatedMatrix[i][j] = matrix[t[0]][t[1]];
            }
        }

        return rotatedMatrix;
    }


    getPreviousCoordinate(x, y, t = 1) {
        const big = [
            [0, 0],
            [0, 1],
            [0, 2],
            [0, 3],
            [1, 3],
            [2, 3],
            [3, 3],
            [3, 2],
            [3, 1],
            [3, 0],
            [2, 0],
            [1, 0],
            [0, 0]
        ]
        const small = [
            [1, 1],
            [1, 2],
            [2, 2],
            [2, 1],
            [1, 1],
        ]
        if (small.some(item => item[0] == x && item[1] == y)) {
            return small[small.findIndex((item, i) => item[0] == x && item[1] == y && (t == 1 || i != 0)) + t]
        } else {
            return big[big.findIndex((item, i) => item[0] == x && item[1] == y && (t == 1 || i != 0)) + t]
        }
    }

    rotatePiece() {
        checkerboard = this.rotationMatrix(checkerboard)
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const gameObject = checkerboard_object[i][j]
                if (gameObject) {
                    const t = this.getPreviousCoordinate(i, j, -1);
                    this.movePiece_animation(gameObject, t[1], t[0])
                }
            }
        }
        checkerboard_object = this.rotationMatrix(checkerboard_object)
        console.log(checkerboard)
    }

    update(time, delta) {
        switch (Mystate) {
            case 0:
                this.hint.setText('waiting for opponent')
                break;
            case 1:
                this.hint.setText("Move opponent's pieces")
                break;
            case 2:
                this.hint.setText('place chess pieces')
                break;
            case 3:
                this.hint.setText('press the middle button')
                break;

            default:
                break;
        }

        const animationSpeed = 0.005; // 調整此值以改變動畫速度

        this.animatingPieces.forEach((piece, index) => {
            piece.setData('moveProgress', piece.getData('moveProgress') + animationSpeed * delta);
            const progress = Math.min(piece.getData('moveProgress'), 1);

            const startX = piece.getData('startX');
            const startY = piece.getData('startY');
            const targetX = piece.getData('targetX');
            const targetY = piece.getData('targetY');

            piece.x = startX + (targetX - startX) * progress;
            piece.y = startY + (targetY - startY) * progress;

            if (progress >= 1) {
                this.animatingPieces.splice(index, 1);
            }
        });
    }

}

class DebugScene extends Phaser.Scene {
    constructor() {
        super({
            key: "DebugScene",
        })
    }
    create() {
        // 創建半透明網格背景

        const cellSize = 50;
        const width = 950;
        const height = 500;

        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x000000, 0.1);

        for (let x = 0; x < width; x += cellSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }

        for (let y = 0; y < height; y += cellSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }

        graphics.strokePath();

        // 創建右上角座標顯示文本
        this.coordsText = this.add.text(width - 100, 10, '', {
            font: '24px Arial',
            color: '#ffffff'
        }).setOrigin(1, 0);

        // 更新滑鼠座標
        this.input.on('pointermove', (pointer) => {
            this.coordsText.setText(`X: ${Math.floor(pointer.x)}, Y: ${Math.floor(pointer.y)}`);
        });
    }
}

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game',
        width: 1200,
        height: 900,
        min: {
            width: 400,
            height: 300
        },
        max: {
            width: 1200,
            height: 900
        }
    },
    autoRound: true,
    scene: [
        LoadScene,
        GameScene,
        DebugScene
    ]
};

function gameStarts(newCheckerboard) {
    checkerboard = newCheckerboard
    console.log("game start", newCheckerboard)
    game = new Phaser.Game(config);
}