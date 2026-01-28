
import React from 'react';

interface InputSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

const InputSection: React.FC<InputSectionProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <i className={`fa-solid ${icon} text-blue-600`}></i>
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );
};

export default InputSection;
