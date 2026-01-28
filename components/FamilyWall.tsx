
import React from 'react';
import { FamilyNote } from '../types';

const FamilyWall: React.FC = () => {
  const notes: FamilyNote[] = [
    { id: '1', sender: '儿子 小明', content: '爸，今天降温了，出门记得多穿件外套！', time: '10:30' },
    { id: '2', sender: '孙女 悦悦', content: '爷爷，我考试得了一百分，周末去看您！', time: '昨天' },
    { id: '3', sender: '女儿 小红', content: '买的补品到了，记得分早晚各吃一次。', time: '2小时前' }
  ];

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-3xl font-bold text-slate-800">亲情留言板</h2>
      <div className="space-y-4">
        {notes.map(note => (
          <div key={note.id} className="bg-white p-6 rounded-[40px] shadow-sm border-l-8 border-rose-400">
            <div className="flex justify-between items-center mb-2">
              <span className="text-rose-500 font-bold text-xl">{note.sender}</span>
              <span className="text-slate-400 text-sm">{note.time}</span>
            </div>
            <p className="text-2xl text-slate-800 leading-relaxed font-medium">
              {note.content}
            </p>
          </div>
        ))}
      </div>
      
      <div className="bg-rose-50 p-8 rounded-[40px] text-center border-2 border-dashed border-rose-200">
        <span className="text-5xl block mb-4">🤳</span>
        <p className="text-rose-600 text-xl font-bold">孩子们的爱时刻都在</p>
      </div>
    </div>
  );
};

export default FamilyWall;
