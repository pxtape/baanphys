export function PhysicsIllustration({ className = "" }: { className?: string }) {
  return <svg aria-labelledby="physics-illustration-title" role="img" viewBox="0 0 520 400" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <title id="physics-illustration-title">แผนภาพการเคลื่อนที่แบบโปรเจกไทล์</title>
    <path d="M48 333H470M74 358V42" stroke="#B6C1C2" strokeWidth="1.5"/>
    <path d="M85 310C145 264 189 162 280 138C357 118 406 173 449 310" stroke="#167A72" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 9"/>
    <path d="M87 310L184 236" stroke="#172B3A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M177 233L193 230L187 245" stroke="#172B3A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M89 310L177 310" stroke="#B9783C" strokeWidth="2" strokeLinecap="round"/>
    <path d="M177 310L168 305M177 310L168 315" stroke="#B9783C" strokeWidth="2" strokeLinecap="round"/>
    <path d="M280 138V310" stroke="#B6C1C2" strokeWidth="1.5" strokeDasharray="4 6"/>
    <circle cx="87" cy="310" r="9" fill="#B9783C"/><circle cx="280" cy="138" r="6" fill="#167A72"/><circle cx="449" cy="280" r="6" fill="#167A72"/>
    <path d="M280 138V184" stroke="#167A72" strokeWidth="2" strokeLinecap="round"/><path d="M280 184L273 174M280 184L287 174" stroke="#167A72" strokeWidth="2" strokeLinecap="round"/>
    <path d="M95 294L139 260" stroke="#172B3A" strokeWidth="1.2"/><path d="M146 250L157 244" stroke="#172B3A" strokeWidth="1.2"/>
    <text x="113" y="292" fill="#172B3A" fontSize="16" fontFamily="sans-serif">u</text>
    <text x="324" y="153" fill="#167A72" fontSize="16" fontFamily="sans-serif">g</text>
    <text x="430" y="350" fill="#66767B" fontSize="13" fontFamily="sans-serif">x</text>
    <text x="56" y="56" fill="#66767B" fontSize="13" fontFamily="sans-serif">y</text>
    <text x="310" y="120" fill="#66767B" fontSize="12" fontFamily="sans-serif">จุดสูงสุด</text>
    <path d="M252 138H280" stroke="#B9783C" strokeWidth="1.5"/><path d="M252 138L259 134M252 138L259 142" stroke="#B9783C" strokeWidth="1.5"/>
    <text x="91" y="344" fill="#66767B" fontSize="12" fontFamily="sans-serif">จุดเริ่มต้น</text>
  </svg>;
}
