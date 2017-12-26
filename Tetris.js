const totalCells = 150, 
      allCellsIn2D = [];
const totalRows = totalCells/10;
const cellFactory = {
  clear:function(){ 
    this.used=0; 
    this.color='white'; 
  },
  create:function(){
      let cell= Object.create(this);
      cell.used = 0;
      cell.color='white';
      return cell;
  }
};

const allCells = new Array(totalCells).fill().map(i=>cellFactory.create());
for (let i = 0; i < totalRows; i++)
  allCellsIn2D.push(allCells.slice(i * 10, i * 10 + 10));

const tetrominoFactory = { 
  shape: function() { return this.masks[this.clock] },
  binary16 : function() { return ('0000000000000000' +  this.shape().toString(2) ).slice(-16).split('');},
  array44: function() {return chunkArray(this.binary16(),4)},
 
  templates:[
    { name:'I', masks : [0x4444, 0x0f00, 0x4444, 0x0f00], clock : 0, color : 'aqua'       , r : -3, c: 4, rLast: null, cLast : null },
    { name:'O', masks : [0x0660, 0x0660, 0x0660, 0x0660], clock : 0, color : 'yellow'     , r : -2, c: 4, rLast: null, cLast : null }, 
    { name:'T', masks : [0x0E40, 0x4C40, 0x4E00, 0x4640], clock : 0, color : 'purple'     , r : -2, c: 4, rLast: null, cLast : null },
    { name:'J', masks : [0x2260, 0x08e0, 0x6440, 0x0710], clock : 0, color : 'blue'       , r : -2, c: 4, rLast: null, cLast : null },
    { name:'L', masks : [0x4460, 0x0e80, 0x6220, 0x02e0], clock : 0, color : 'orange'     , r : -2, c: 4, rLast: null, cLast : null },
    { name:'S', masks : [0x0360, 0x2310, 0x0360, 0x2310], clock : 0, color : 'lawngreen'  , r : -2, c: 4, rLast: null, cLast : null },
    { name:'Z', masks : [0x0c60, 0x2640, 0x0c60, 0x2640], clock : 0, color : 'red'        , r : -2, c: 4, rLast: null, cLast : null }],

  create: function(){
    let random = Math.random() * this.templates.length; 
    let values = this.templates[Math.floor(random)];
    let instance = Object.create(this);
    Object.keys(values).forEach(function (key) {
      instance[key] = values[key];
    });
    return instance;
  }
};

var app = new Vue({
  el: "#app",
  data: {
    intervalID: 0,
    intervalBase: 50,
    intervalFactor:10,

    tetromino: tetrominoFactory.create(),
    tetrominoNext: tetrominoFactory.create(),
    board: allCellsIn2D,
    rLast: 0,
    cLast: 0,
    score: 0,
    rowsCleared:0,
    paused:false,
    i:0
  },

  created: function () {
    window.addEventListener('keydown', this.keyHandle)
    this.start();
  },

  computed: {
    intervalS: function() { return this.intervalBase/1000 +'s'},
    gameOver: function () { return (!this.canFall) && this.tetromino.r < 0; },
    canFall: function ()  {
      var shape = this.tetromino.shape();
      var {r,c} = this.tetromino;
      var space = this.sliceToInt(r+1,c, 1);
      var OK = (shape & space) ==0
      return OK;
    },
    canLeft: function ()  {
      var shape = this.tetromino.shape();
      var {r,c} = this.tetromino;
      var space = this.sliceToInt(r,c-1, 1);
      var OK = (shape & space) ==0
      return OK;
    },
    canRight: function () {
      var shape = this.tetromino.shape();
      var {r,c} = this.tetromino;
      var space = this.sliceToInt(r,c+1, 1);
      var OK = (shape & space) ==0
      return OK;
    },
  },
  methods: {
      checkRowFull: function () {
        var fulls = this.board.filter(r=> r.every(i=>i.used > 0));

        fulls.forEach(r=> {
          this.score += 10;
          this.rowsCleared += 1;
          this.intervalFactor = this.intervalFactor - 0.25;
          console.log(this.intervalFactor)
          this.board.splice(this.board.indexOf(r), 1);
          this.board.unshift(new Array(10).fill().map(i=>({ used: 0 })));
        });
      },

    sliceToInt: function (r=0, c=0, level=0){//, rs=4, cs=4)
      //111111111111 is a wall,
      //build walls around board
      //so no piece can move out of board

      var rtn = new Array(4).fill();
      for(let i = 0;i < 4; i++){
        var rowString = (i+r) >totalRows -1?'1111111111': (i+r)<0?'0000000000':
          this.board[i+r].map(c=> c.used > level ? 1:0).join(''); 
              //&& (c.usedBy !== this.tetromino || exceptSelf === false) 
        var s18 = '1111' + rowString +'1111' //18
        rtn[i] = s18.slice(c+4,c+4+4).split('');
      }

      var s = rtn.map(i=>i.join('')).join('');
      return parseInt(s,2);
    },

    fall:function(){
      this.undraw();
      this.tetromino.r = this.tetromino.r + 1;
      this.draw();
    },
    toogle:function(){
      this.paused = !this.paused;
    },

    start: function () {
      allCellsIn2D.forEach(r=>r.forEach(i=>  i.clear() ));  
      if (this.intervalID > 0) clearInterval(this.intervalID);
      this.i=1;
      
      this.intervalID = setInterval(this.step, this.intervalBase)
    },
    step: function(i){
        if(this.i++ % this.intervalFactor != 0) return;  
        if(this.paused) return;
        if (this.gameOver) {
          console.log("Game Over!");
          clearInterval(this.intervalID);
          return;
        };

        if (this.canFall)    this.fall();
        else {
          this.freezeTetromino();
          this.tetromino = this.tetrominoNext; //tetrominoFactory.create(); 
          this.tetrominoNext = tetrominoFactory.create();
    
          this.checkRowFull();
          this.score += 7;
        }
    },

    draw: function () {
      var {r, c, rLast, cLast, masks } = this.tetromino;
      this.tetromino.rLast = r;
      this.tetromino.cLast = c;
      this.setUsed(r,c,1);
    },
    undraw: function () {
      var {r,c,rLast, cLast, masks} = this.tetromino;
      if (rLast == null) return;
      this.setUsed(rLast, cLast, 0);
    },

    freezeTetromino: function(){
      var {r,c,rLast, cLast, masks} = this.tetromino;
      this.setUsed(rLast,cLast,2);
    },
    setUsed: function (r,c, value) {
      //other values are not touched
      //shared by draw, setUsed(3,2,1)
      //and undraw      setUsed(3,2,0)
      var a44 = chunkArray(this.tetromino.binary16(),4);
      for(i = 0; i<4;i++){
        var r2 = r+i;
        if(r2 < 0 || r2 >totalRows -1) continue;
        for(j =0;j<4;j++){
          var c2 = c+j;
          if(c2<0 || c2>9) continue;
          if(a44[i][j] == 1){
            this.board[r2][c2].used = value; //other values are not touched;
            
            this.board[r2][c2].color= value==0?'white': this.tetromino.color;            
          }
        }
      }
    },

    keyHandle: function (e) {
      switch (e.key) {
        case "ArrowUp":
          this.undraw();
          this.tetromino.clock  = (this.tetromino.clock +1) %4;
          this.draw();
          break;
        case "ArrowLeft":
          if (!this.canLeft) return;
          this.tetromino.c -= 1;
          this.undraw();
          this.draw();
          break;
        case "ArrowRight":
          if (!this.canRight) return;
          this.tetromino.c += 1;
          this.undraw();
          this.draw();
          break;
        case "ArrowDown":
          if (!this.canFall) return;
          this.tetromino.r += 1;
          this.undraw();
          this.draw();
          break;
        default:
          console.log(e.key);
          break;
      }
    }
  },
});

function chunkArray(array1D,size=1){
  var clone = array1D.slice(0);
  var arrayIn2D = [];
  while (clone.length>0)
    arrayIn2D.push(clone.splice(0,size));
  return arrayIn2D;
};
