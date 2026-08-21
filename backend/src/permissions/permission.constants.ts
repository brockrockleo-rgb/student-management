import { Position } from "src/entities/position.enum";
export const FIXED_PERMISSION_DEFINITIONS=[
    {
        code:"students.view",
        name:"xem sinh vien",
    },{
        code :"students.create",
        name:"them sinh vien",
    },{
        code:"students.update",
        name:"sua sinh vien",
    },{
        code:"students.delete",
        name:"xoa sinh vien",
    },
    {
        code:"teachers.view",
        name:"xem giao vien",
    },{
        code :"teachers.create",
        name:"them giao vien",
    },{
        code:"teachers.update",
        name:"sua giao vien",
    },{
        code:"teachers.delete",
        name:"xoas giao vien",
    },
    {
        code:"departments.view",
        name:"xem khoa",
    },{
        code:"departments.create",
        name:"taoj khoa",
    },{
        code:"departments.update",
        name:"sua khoa",
    },{
        code:"departments.delete",
        name:"xoa khoa"
    },
    {
        code:"classes.view",
        name:"xem lop",
    },{
        code:"classes.create",
        name:"tao 1 lop mowis",

    },{
        code:"classes.update",
        name:"sua lop",
    },{
        code:"classes.delete",
        name:"xoa lopws",
    },
    {
        code:"users.view",
        name:"xem nguoi dung",

    },{
        code:"users.create",
        name:"tao nguoi fung",
    },
    {
        code:"users.update",
        name:"sua nguoi dung",
    },{
        code:"users.delete",
        name:"xoa nguoi dung mowis"
    },

]as const;
export const FIXED_PERMISSION_CODES=FIXED_PERMISSION_DEFINITIONS.map(item=>item.code);

export const DEFAULT_PERMISSION_CODES:
Record<Position, readonly string[]> = {

  [Position.ADMIN]: [],

  [Position.TEACHER]: [
    "students.view",
    "students.create",
    "students.update",
    "students.delete",
    "classes.view",
  ],

  [Position.STUDENT]: [
    "students.view",
  ],
};