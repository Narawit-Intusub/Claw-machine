// ========== ตัวแปรสำหรับเก็บ element ต่างๆ ==========
const elements = {
  clawMachine: document.querySelector('.claw-machine'), // ตัวเครื่องคีบตุ๊กตา
  box: document.querySelector('.box'), // กล่องที่ใส่ตุ๊กตา
  collectionBox: document.querySelector('.collection-box'), // กล่องเก็บตุ๊กตาที่คีบได้
  collectionArrow: document.querySelector('.collection-arrow'), // ลูกศรชี้ไปที่ตุ๊กตาที่คีบได้
  toys: [], // อาเรย์เก็บตุ๊กตาทั้งหมด
}

// ========== การตั้งค่าเกม ==========
const settings = {
  targetToy: null, // ตุ๊กตาที่กำลังจะคีบ
  collectedNumber: 0, // จำนวนตุ๊กตาที่เก็บได้แล้ว
}

// ========== ตัวคูณสำหรับขนาดตุ๊กตา ==========
const m = 2

// ========== ข้อมูลขนาดของตุ๊กตาแต่ละแบบ ==========
const toys = {
  bear: { w: 20 * m, h: 27 * m },      // หมี
  bunny: { w: 20 * m, h: 29 * m },     // กระต่าย
  golem: { w: 20 * m, h: 27 * m },     // โกเล็ม
  cucumber: { w: 16 * m, h: 28 * m },  // แตงกวา
  penguin: { w: 24 * m, h: 22 * m },   // เพนกวิน
  robot: { w: 20 * m, h: 30 * m },     // หุ่นยนต์
}

// ========== สุ่มลำดับตุ๊กตา (ซ้ำ 2 เซต) ==========
const sortedToys = [...Object.keys(toys), ...Object.keys(toys)].sort(
  () => 0.5 - Math.random(),
)

// ========== ค่าการจัดตำแหน่ง ==========
const cornerBuffer = 16 // ระยะห่างจากขอบ

const machineBuffer = {
  x: 36, // ระยะห่างด้านข้าง
  y: 16, // ระยะห่างด้านบนล่าง
}

// ========== ฟังก์ชันคำนวณ ==========
const radToDeg = rad => Math.round(rad * (180 / Math.PI)) // แปลงเรเดียนเป็นองศา
const calcX = (i, n) => i % n // คำนวณตำแหน่ง X
const calcY = (i, n) => Math.floor(i / n) // คำนวณตำแหน่ง Y

// ========== ข้อมูลขนาดเครื่องคีบตุ๊กตา ==========
const {
  width: machineWidth,
  height: machineHeight,
  top: machineTop,
} = document.querySelector('.claw-machine').getBoundingClientRect()

const { height: machineTopHeight } = document
  .querySelector('.machine-top')
  .getBoundingClientRect()

const { height: machineBottomHeight, top: machineBottomTop } = document
  .querySelector('.machine-bottom')
  .getBoundingClientRect()

// คำนวณความยาวแขนสูงสุด
const maxArmLength = machineBottomTop - machineTop - machineBuffer.y

// ========== ฟังก์ชันช่วยเหลือ ==========
// ปรับมุมให้อยู่ในช่วง 0-360 องศา
const adjustAngle = angle => {
  const adjustedAngle = angle % 360
  return adjustedAngle < 0 ? adjustedAngle + 360 : adjustedAngle
}

// สุ่มตัวเลขในช่วงที่กำหนด
const randomN = (min, max) => {
  return Math.round(min - 0.5 + Math.random() * (max - min + 1))
}

// ========== คลาสปุ่มกด ==========
class Button {
  constructor({ className, action, isLocked, pressAction, releaseAction }) {
    Object.assign(this, {
      el: document.querySelector(`.${className}`),
      isLocked, // สถานะล็อคปุ่ม
    })
    
    // เพิ่ม event listener ต่างๆ
    this.el.addEventListener('click', action)
    
    // เหตุการณ์เมื่อกดปุ่ม (mouse และ touch)
    ;['mousedown', 'touchstart'].forEach(action =>
      this.el.addEventListener(action, pressAction),
    )
    
    // เหตุการณ์เมื่อปล่ปุ่ม (mouse และ touch)
    ;['mouseup', 'touchend'].forEach(action =>
      this.el.addEventListener(action, releaseAction),
    )

    if (!isLocked) this.activate()
  }
  
  // เปิดใช้งานปุ่ม
  activate() {
    this.isLocked = false
    this.el.classList.add('active')
  }
  
  // ปิดใช้งานปุ่ม
  deactivate() {
    this.isLocked = true
    this.el.classList.remove('active')
  }
}

// ========== คลาสวัตถุในโลก ==========
class WorldObject {
  constructor(props) {
    Object.assign(this, {
      x: 0, // ตำแหน่ง X
      y: 0, // ตำแหน่ง Y
      z: 0, // ลำดับชั้น (z-index)
      angle: 0, // มุมหมุน
      transformOrigin: { x: 0, y: 0 }, // จุดหมุน
      interval: null, // ตัวจับเวลาสำหรับการเคลื่อนไหว
      default: {}, // ค่าเริ่มต้น
      moveWith: [], // วัตถุที่เคลื่อนไหวไปด้วยกัน
      el: props.className && document.querySelector(`.${props.className}`),
      ...props,
    })
    
    this.setStyles() // ตั้งค่า CSS
    
    // คำนวณขนาดจาก element
    if (props.className) {
      const { width, height } = this.el.getBoundingClientRect()
      this.w = width
      this.h = height
    }
    
    // เก็บค่าเริ่มต้น
    ;['x', 'y', 'w', 'h'].forEach(key => {
      this.default[key] = this[key]
    })
  }
  
  // ตั้งค่า CSS styles
  setStyles() {
    Object.assign(this.el.style, {
      left: `${this.x}px`,
      top: !this.bottom && `${this.y}px`,
      bottom: this.bottom,
      width: `${this.w}px`,
      height: `${this.h}px`,
      transformOrigin: this.transformOrigin,
    })
    this.el.style.zIndex = this.z
  }
  
  // ตั้งค่าตำแหน่งก้าม
  setClawPos(clawPos) {
    this.clawPos = clawPos
  }
  
  // ตั้งค่าจุดหมุน
  setTransformOrigin(transformOrigin) {
    this.transformOrigin =
      transformOrigin === 'center'
        ? 'center'
        : `${transformOrigin.x}px ${transformOrigin.y}px`
    this.setStyles()
  }
  
  // จัดการขั้นตอนถัดไป
  handleNext(next) {
    clearInterval(this.interval)
    if (next) next()
  }
  
  // เริ่มการเคลื่อนไหวใหม่
  resumeMove({ moveKey, target, moveTime, next }) {
    this.interval = null
    this.move({ moveKey, target, moveTime, next })
  }
  
  // ปรับขนาดเงา
  resizeShadow() {
    elements.box.style.setProperty('--scale', 0.5 + this.h / maxArmLength / 2)
  }
  
  // ฟังก์ชันเคลื่อนไหว
  move({ moveKey, target, moveTime, next }) {
    if (this.interval) {
      // ถ้ากำลังเคลื่อนไหวอยู่ ให้หยุดและทำขั้นตอนถัดไป
      this.handleNext(next)
    } else {
      const moveTarget = target || this.default[moveKey]
      this.interval = setInterval(() => {
        // คำนวณระยะทางที่จะเคลื่อนไหว
        const distance =
          Math.abs(this[moveKey] - moveTarget) < 10
            ? Math.abs(this[moveKey] - moveTarget)
            : 10
        const increment = this[moveKey] > moveTarget ? -distance : distance
        
        if (
          increment > 0
            ? this[moveKey] < moveTarget
            : this[moveKey] > moveTarget
        ) {
          // เคลื่อนไหวไปยังเป้าหมาย
          this[moveKey] += increment
          this.setStyles()
          
          // ปรับเงาถ้าเป็นการเปลี่ยนความสูง
          if (moveKey === 'h') this.resizeShadow()
          
          // เคลื่อนไหววัตถุที่ติดมาด้วย
          if (this.moveWith.length) {
            this.moveWith.forEach(obj => {
              if (!obj) return
              obj[moveKey === 'h' ? 'y' : moveKey] += increment
              obj.setStyles()
            })
          }
        } else {
          // ถึงเป้าหมายแล้ว ทำขั้นตอนถัดไป
          this.handleNext(next)
        }
      }, moveTime || 100)
    }
  }
  
  // คำนวณระยะห่างระหว่างวัตถุ
  distanceBetween(target) {
    return Math.round(
      Math.sqrt(
        Math.pow(this.x - target.x, 2) + Math.pow(this.y - target.y, 2),
      ),
    )
  }
}

// ========== คลาสตุ๊กตา ==========
class Toy extends WorldObject {
  constructor(props) {
    const toyType = sortedToys[props.index]
    const size = toys[toyType]
    
    super({
      // สร้าง element ตุ๊กตา
      el: Object.assign(document.createElement('div'), {
        className: `toy pix ${toyType}`,
      }),
      // คำนวณตำแหน่งแบบกริด 4x3 พร้อมการสุ่มเล็กน้อย
      x:
        cornerBuffer +
        calcX(props.index, 4) * ((machineWidth - cornerBuffer * 3) / 4) +
        size.w / 2 +
        randomN(-6, 6),
      y:
        machineBottomTop -
        machineTop +
        cornerBuffer +
        calcY(props.index, 4) *
          ((machineBottomHeight - cornerBuffer * 2) / 3) -
        size.h / 2 +
        randomN(-2, 2),
      z: 0,
      toyType,
      ...size,
      ...props,
    })
    
    elements.box.append(this.el) // เพิ่มเข้าไปในกล่อง
    const toy = this

    // เพิ่ม event listener สำหรับคลิกเก็บตุ๊กตา
    this.el.addEventListener('click', () => this.collectToy(toy))
    elements.toys.push(this) // เพิ่มเข้าไปในอาเรย์ตุ๊กตา
  }
  
  // ฟังก์ชันเก็บตุ๊กตา
  collectToy(toy) {
    toy.el.classList.remove('selected')
    
    // ย้ายตุ๊กตาไปกลางหน้าจอ
    toy.x = machineWidth / 2 - toy.w / 2
    toy.y = machineHeight / 2 - toy.h / 2
    toy.z = 7
    toy.el.style.setProperty('--rotate-angle', '0deg')
    toy.setTransformOrigin('center')
    toy.el.classList.add('display')
    
    // แสดง overlay
    elements.clawMachine.classList.add('show-overlay')
    settings.collectedNumber++
    
    // เพิ่มตุ๊กตาเข้าไปในกล่องเก็บ
    elements.collectionBox.appendChild(
      Object.assign(document.createElement('div'), {
        className: `toy-wrapper ${
          settings.collectedNumber > 6 ? 'squeeze-in' : ''
        }`,
        innerHTML: `<div class="toy pix ${toy.toyType}"></div>`,
      }),
    )
    
    // ซ่อน overlay หลัง 1 วินาที
    setTimeout(() => {
      elements.clawMachine.classList.remove('show-overlay')
      if (!document.querySelector('.selected'))
        elements.collectionArrow.classList.remove('active')
    }, 1000)
  }
  
  // คำนวณมุมหมุนตุ๊กตาตามตำแหน่งก้าม
  setRotateAngle() {
    const angle =
      radToDeg(
        Math.atan2(
          this.y + this.h / 2 - this.clawPos.y,
          this.x + this.w / 2 - this.clawPos.x,
        ),
      ) - 90
    const adjustedAngle = Math.round(adjustAngle(angle))
    this.angle =
      adjustedAngle < 180 ? adjustedAngle * -1 : 360 - adjustedAngle
    this.el.style.setProperty('--rotate-angle', `${this.angle}deg`)
  }
}

// ========== การตั้งค่าเริ่มต้น ==========
elements.box.style.setProperty('--shadow-pos', `${maxArmLength}px`)

// สร้างวัตถุต่างๆ
const armJoint = new WorldObject({
  className: 'arm-joint', // ข้อต่อแขน
})

const vertRail = new WorldObject({
  className: 'vert', // รางแนวตั้ง
  moveWith: [null, armJoint], // เคลื่อนไหวพร้อมกับข้อต่อแขน
})

const arm = new WorldObject({
  className: 'arm', // แขนก้าม
})

// ========== การเคลื่อนไหวเริ่มต้น ==========
armJoint.resizeShadow()

// เคลื่อนไหวไปตำแหน่งเริ่มต้น
armJoint.move({
  moveKey: 'y',
  target: machineTopHeight - machineBuffer.y,
  moveTime: 50,
  next: () =>
    vertRail.resumeMove({
      moveKey: 'x',
      target: machineBuffer.x,
      moveTime: 50,
      next: () => {
        // บันทึกตำแหน่งเริ่มต้น
        Object.assign(armJoint.default, {
          y: machineTopHeight - machineBuffer.y,
          x: machineBuffer.x,
        })
        Object.assign(vertRail.default, {
          x: machineBuffer.x,
        })
        activateHoriBtn() // เปิดใช้ปุ่มแนวนอน
      },
    }),
})

// ========== ฟังก์ชันตรวจสอบการชน ==========
const doOverlap = (a, b) => {
  return b.x > a.x && b.x < a.x + a.w && b.y > a.y && b.y < a.y + a.h
}

// ========== ฟังก์ชันหาตุ๊กตาที่ใกล้ที่สุด ==========
const getClosestToy = () => {
  // ตำแหน่งและขนาดของก้าม
  const claw = {
    y: armJoint.y + maxArmLength + machineBuffer.y + 7,
    x: armJoint.x + 7,
    w: 40,
    h: 32,
  }
  
  // หาตุ๊กตาที่อยู่ในพื้นที่ก้าม
  const overlappedToys = elements.toys.filter(t => {
    return doOverlap(t, claw)
  })

  if (overlappedToys.length) {
    // เลือกตุ๊กตาที่มี index สูงสุด (วาดทีหลัง = อยู่บนสุด)
    const toy = overlappedToys.sort((a, b) => b.index - a.index)[0]
    toy.setTransformOrigin({
      x: claw.x - toy.x,
      y: claw.y - toy.y,
    })
    toy.setClawPos({
      x: claw.x,
      y: claw.y,
    })
    settings.targetToy = toy
  }
}

// ========== สร้างตุ๊กตา 12 ตัว (ข้าม index 8) ==========
new Array(12).fill('').forEach((_, i) => {
  if (i === 8) return // ข้ามตำแหน่งที่ 8 (ช่องว่าง)
  new Toy({ index: i })
})

// ========== ฟังก์ชันควบคุมปุ่ม ==========
const stopHoriBtnAndActivateVertBtn = () => {
  armJoint.interval = null
  horiBtn.deactivate() // ปิดปุ่มแนวนอน
  vertBtn.activate()   // เปิดปุ่มแนวตั้ง
}

const activateHoriBtn = () => {
  horiBtn.activate() // เปิดปุ่มแนวนอน
  // หยุดการเคลื่อนไหวทั้งหมด
  ;[vertRail, armJoint, arm].forEach(c => (c.interval = null))
}

// ========== ฟังก์ชันปล่อยตุ๊กตา ==========
const dropToy = () => {
  arm.el.classList.add('open') // เปิดก้าม
  
  if (settings.targetToy) {
    settings.targetToy.z = 3
    // ปล่อยตุ๊กตาลงพื้น
    settings.targetToy.move({
      moveKey: 'y',
      target: machineHeight - settings.targetToy.h - 30,
      moveTime: 50,
    })
    // ไม่ให้ตุ๊กตาเคลื่อนไหวตามแขนแล้ว
    ;[vertRail, armJoint, arm].forEach(obj => (obj.moveWith[0] = null))
  }
  
  setTimeout(() => {
    arm.el.classList.remove('open') // ปิดก้าม
    activateHoriBtn() // เปิดปุ่มแนวนอนใหม่
    
    if (settings.targetToy) {
      // ทำให้ตุ๊กตาเป็นตัวที่เลือกได้
      settings.targetToy.el.classList.add('selected')
      elements.collectionArrow.classList.add('active') // แสดงลูกศร
      settings.targetToy = null
    }
  }, 700)
}

// ========== ฟังก์ชันคีบตุ๊กตา ==========
const grabToy = () => {
  if (settings.targetToy) {
    // ให้ตุ๊กตาเคลื่อนไหวตามแขน
    ;[vertRail, armJoint, arm].forEach(
      obj => (obj.moveWith[0] = settings.targetToy),
    )
    settings.targetToy.setRotateAngle() // หมุนตุ๊กตา
    settings.targetToy.el.classList.add('grabbed') // เพิ่มคลาสถูกคีบ
  } else {
    arm.el.classList.add('missed') // แสดงว่าคีบพลาด
  }
}

// ========== สร้างปุ่มแนวนอน ==========
const horiBtn = new Button({
  className: 'hori-btn',
  isLocked: true, // เริ่มต้นล็อค
  pressAction: () => {
    arm.el.classList.remove('missed')
    // เคลื่อนที่แนวนอนไปขวาสุด
    vertRail.move({
      moveKey: 'x',
      target: machineWidth - armJoint.w - machineBuffer.x,
      next: stopHoriBtnAndActivateVertBtn,
    })
  },
  releaseAction: () => {
    // ปล่อยปุ่มแล้วหยุดการเคลื่อนไหว
    clearInterval(vertRail.interval)
    stopHoriBtnAndActivateVertBtn()
  },
})

// ========== สร้างปุ่มแนวตั้ง ==========
const vertBtn = new Button({
  className: 'vert-btn',
  isLocked: true, // เริ่มต้นล็อค
  pressAction: () => {
    if (vertBtn.isLocked) return
    // เคลื่อนที่แนวตั้งขึ้นบน
    armJoint.move({
      moveKey: 'y',
      target: machineBuffer.y,
    })
  },
  releaseAction: () => {
    // ปล่อยปุ่มแล้วเริ่มกระบวนการคีบ
    clearInterval(armJoint.interval)
    vertBtn.deactivate()
    getClosestToy() // หาตุ๊กตาที่จะคีบ
    
    setTimeout(() => {
      arm.el.classList.add('open') // เปิดก้าม
      // ยื่นแขนลง
      arm.move({
        moveKey: 'h',
        target: maxArmLength,
        next: () =>
          setTimeout(() => {
            arm.el.classList.remove('open') // ปิดก้าม (คีบ)
            grabToy() // คีบตุ๊กตา
            // ดึงแขนขึ้น
            arm.resumeMove({
              moveKey: 'h',
              next: () => {
                // เลื่อนไปซ้าย
                vertRail.resumeMove({
                  moveKey: 'x',
                  next: () => {
                    // เลื่อนขึ้นบน
                    armJoint.resumeMove({
                      moveKey: 'y',
                      next: dropToy, // ปล่อยตุ๊กตา
                    })
                  },
                })
              },
            })
          }, 500),
      })
    }, 500)
  },
})