const allowed = /^\/(courses|profile|calendar|admin\/(students|content|calendar))(\/)?(\?[^#]*)?$/;
export function safeReturnPath(value:string|null){return value&&allowed.test(value)?value:null;}
export function rememberClassroomPath(){
 const base=process.env.NEXT_PUBLIC_BASE_PATH??"";
 let path=window.location.pathname;
 if(base&&path.startsWith(base+"/"))path=path.slice(base.length);
 // Production static export uses a fixed repository prefix.
 if(path.startsWith("/baanphys/"))path=path.slice("/baanphys".length);
 const safe=safeReturnPath(path+window.location.search);
 if(safe)sessionStorage.setItem("baanphys:returnTo",safe);
}
export function takeClassroomPath(fallback:string){const value=sessionStorage.getItem("baanphys:returnTo");sessionStorage.removeItem("baanphys:returnTo");return safeReturnPath(value)??fallback;}

