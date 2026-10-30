"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {BookOpen,CalendarDays,Users,Files,UserRound,LogOut,RefreshCw} from "lucide-react";
import {ExplorerMark} from "./ExplorerStudio";

export function StudioNavigation({admin,workspace,displayName,onRefresh,onSignOut}:{admin:boolean;workspace:boolean;displayName:string;onRefresh:()=>void;onSignOut:()=>void}){
 const rawPath=usePathname()??"",base=process.env.NEXT_PUBLIC_BASE_PATH??"";
 const pathname=(base&&rawPath.startsWith(base+"/")?rawPath.slice(base.length):rawPath).replace(/\/$/,"");
 const links=workspace?[{href:"/admin/students",label:"นักเรียน",icon:Users},{href:"/admin/content",label:"บทเรียนและไฟล์",icon:Files},{href:"/admin/calendar",label:"ปฏิทินติวเตอร์",icon:CalendarDays},{href:"/courses",label:"ดูแบบนักเรียน",icon:BookOpen}]:[{href:"/courses",label:"ห้องเรียน",icon:BookOpen},{href:"/calendar",label:"ปฏิทินของฉัน",icon:CalendarDays},{href:"/profile",label:"โปรไฟล์",icon:UserRound},...(admin?[{href:"/admin/students",label:"กลับหลังบ้าน",icon:Users}]:[])];
 return <header className="bp-navigation"><div className="bp-navigation-inner"><Link href="/" className="bp-nav-brand" aria-label="บ้านฟิสิกส์ หน้าแรก"><ExplorerMark/>BAANPHYS</Link><nav aria-label={workspace?"เมนูหลังบ้าน":"เมนูบัญชี"}>{links.map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={pathname?.replace(/\/$/,"")===href?"page":undefined}><Icon size={16}/>{label}</Link>)}</nav><div className="bp-nav-actions"><span className="bp-nav-user">{displayName}</span><button type="button" onClick={onRefresh} aria-label="รีเฟรชข้อมูล" title="รีเฟรชข้อมูล"><RefreshCw size={16}/></button><button type="button" onClick={onSignOut} className="inline-flex items-center gap-1.5"><LogOut size={15}/>ออกจากระบบ</button></div></div></header>;
}

