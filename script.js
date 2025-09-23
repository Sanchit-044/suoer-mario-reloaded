const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const marioImage = new Image()
marioImage.src = './mariorightbig.png'

const gravity = 1.5
class Player {
    constructor() {
        this.position = {
            x: 100,
            y: 100
        }
        this.velocity = {
            x: 0,
            y: 1
        }

        this.width = 30
        this.height = 30
        // this.onground = false
    }

    draw() {

  c.save() // save canvas state before scaling

  if (keys.left.pressed && leftface === 1) {
    // flip horizontally around the player's x-position
    c.translate(this.position.x + this.width, this.position.y)
    c.scale(-1, 1)
    c.drawImage(
      marioImage,
      0, 0, 100, 148,
      0, 0,
      this.width = 50,
      this.height = 100
    )
  } else {
    // normal draw
    c.drawImage(
      marioImage,
      0, 0, 100, 148,
      this.position.x,
      this.position.y,
      this.width = 50,
      this.height = 100
    )
  }

  c.restore() // restore to normal
}



    update() {
        this.draw()
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y
        if (this.position.y + this.height + this.velocity.y <= canvas.height
        ){
            this.velocity.y += gravity
        this.onground = false}
        else {this.velocity.y = 0
            this.position.y = canvas.height - this.height
    //   this.onground = true
        }
    }
    jump() {
    if (this.velocity.y === 0) {
      this.velocity.y -= 20 // adjust jump height
    //   this.onground = false
    }
  }
}
class Platform {
    constructor({x, y }) {
        this.position = {
            x,
            y
        }

        this.width = 200
        this.height = 20
    }

    draw() {
        c.fillStyle = 'blue'
        c.fillRect(this.position.x, this.position.y, this.width, this.height)
    }
}
const player = new Player()

const platforms = [new Platform({
    x:400 ,
    y: 600
}), 
new Platform({
    x:100,
    y:600
}),
new Platform({
    x:600,
    y:500
}),
new Platform({
    x:600,
    y:600,
}),
]

const keys = {
    right: {
        pressed: false
    },
    left: {
        pressed: false
    }

}
let scrollOffset = 0

function animate() {
    requestAnimationFrame(animate)
    c.clearRect(0, 0, canvas.width, canvas.height)
    player.update()
    platforms.forEach(platform => {
        platform.draw()
    })


    if (keys.right.pressed && player.position.x < 400) {
        player.velocity.x = 5
    }
    else if (keys.left.pressed && player.position.x > 100) {
        player.velocity.x = -5
    }

    else {
        player.velocity.x = 0

        if (keys.right.pressed) {
            scrollOffset +=5
            platforms.forEach(platform => {
         platform.position.x -= 5
    })
    
        } else if (keys.left.pressed) {
            scrollOffset -=5
            platforms.forEach(platform => {
         platform.position.x += 5
    })
        
        }

    }
    //platform collision detection
     platforms.forEach(platform => {
    if (player.position.y + player.height <= platform.position.y &&
        player.position.y + player.height + player.velocity.y >= platform.position.y && player.position.x + player.width >= platform.position.x && player.position.x <= platform.position.x +
        platform.width
    ) {
        player.velocity.y = 0
    }
})
if(scrollOffset >2000){
    console.log('you win')
}
}

animate()
let leftface = 0
if(leftface = 1){
    marioImage.src = './mariorightbig.png'
    scale=-1
}   
addEventListener('keydown', ({ key }) => {
    // console.log(keyCode)
    switch (key) {
        case 'a':
            console.log('left')
            keys.left.pressed = true
            break

        case 's':
            console.log('down')
            break

        case 'd':
            console.log('right')
            keys.right.pressed = true
            break

        case 'w':
            console.log('up')
      player.jump()
            break

    }
    console.log(keys.right.pressed)
})
addEventListener('keyup', ({ key }) => {
    // console.log(keyCode)
    switch (key) {
        case 'a':
            console.log('left')
            keys.left.pressed = false
            leftface = 1
            break

        case 's':
            console.log('down')
            break

        case 'd':
            console.log('right')
            keys.right.pressed = false

            break

        case 'w':
            console.log('up')
      player.jump()
            break

    }
    console.log(keys.right.pressed)
})


