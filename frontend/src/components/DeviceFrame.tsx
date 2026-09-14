import React from 'react';
import { Laptop, Lock, Smartphone } from 'lucide-react';

interface DeviceFrameProps {
  deviceMode: 'phone' | 'laptop';
  onToggleDevice: (mode: 'phone' | 'laptop') => void;
  children: React.ReactNode;
}

export function DeviceFrame({ deviceMode, onToggleDevice, children }: DeviceFrameProps) {
  return (
    <div className="min-h-screen bg-[#0A0C0B] text-[#F1EDE3] flex flex-col items-center justify-start md:justify-center p-0 md:py-8 md:px-4 select-none">
      {/* Floating Device Selector Toolbar (Desktop only) */}
      <div className="hidden md:flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-[#171C19] border border-[#303832] shadow-xl z-50">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8B8AD] mr-1">
          Device View:
        </span>
        <button
          type="button"
          onClick={() => onToggleDevice('phone')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer ${
            deviceMode === 'phone'
              ? 'bg-[#8FB69A] text-[#111312] shadow-sm font-bold'
              : 'text-[#B8B8AD] hover:text-[#F1EDE3] hover:bg-[#1D2520]'
          }`}
        >
          <Smartphone size={13} className={deviceMode === 'phone' ? 'stroke-[2.5]' : 'stroke-[2]'} />
          <span>Phone App</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleDevice('laptop')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer ${
            deviceMode === 'laptop'
              ? 'bg-[#8FB69A] text-[#111312] shadow-sm font-bold'
              : 'text-[#B8B8AD] hover:text-[#F1EDE3] hover:bg-[#1D2520]'
          }`}
        >
          <Laptop size={13} className={deviceMode === 'laptop' ? 'stroke-[2.5]' : 'stroke-[2]'} />
          <span>Laptop Screen</span>
        </button>
      </div>

      {/* DEVICE SHELL: PHONE */}
      {deviceMode === 'phone' ? (
        <div className="relative w-full max-w-[425px] flex flex-col items-center">
          {/* Subtle phone side hardware buttons */}
          <div className="hidden md:block absolute -left-[10px] top-[140px] w-[3px] h-[32px] bg-[#2A352C] rounded-l-sm" />
          <div className="hidden md:block absolute -left-[10px] top-[185px] w-[3px] h-[48px] bg-[#2A352C] rounded-l-sm" />
          <div className="hidden md:block absolute -left-[10px] top-[245px] w-[3px] h-[48px] bg-[#2A352C] rounded-l-sm" />
          <div className="hidden md:block absolute -right-[10px] top-[170px] w-[3px] h-[64px] bg-[#2A352C] rounded-r-sm" />

          {/* Smartphone Chassis Frame */}
          <div
            id="smartphone-chassis"
            className="w-full min-h-screen md:min-h-[880px] md:h-[880px] md:max-h-[95vh] bg-[#171C19] md:rounded-[48px] md:border-[8px] md:border-[#202722] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.98)] ring-1 ring-[#37443A]/50 relative flex flex-col overflow-hidden transition-all duration-300"
          >
            {children}

            {/* iOS Style Home Indicator Bar at the bottom of phone */}
            <div className="hidden md:flex justify-center pb-1.5 pt-0.5 pointer-events-none bg-[#171C19]/90 backdrop-blur-sm z-50">
              <div className="w-32 h-1 bg-[#F1EDE3]/30 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        /* DEVICE SHELL: LAPTOP */
        <div className="relative w-full max-w-5xl flex flex-col items-center transition-all duration-300">
          {/* Laptop Screen Lid & Bezel */}
          <div
            id="laptop-display-lid"
            className="w-full bg-[#1C201D] md:rounded-t-2xl md:border-[10px] md:border-[#1C201D] shadow-[0_35px_80px_-20px_rgba(0,0,0,0.95)] ring-1 ring-[#323C35]/50 flex flex-col overflow-hidden"
          >
            {/* Laptop Screen Top Bezel with HD Webcam */}
            <div className="hidden md:flex items-center justify-center py-1.5 bg-[#171B18] border-b border-[#242C26] relative select-none">
              {/* Webcam Lens */}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0D100E] border border-[#2F3A31] flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#1A251E]" />
                </div>
                {/* Active Camera Indicator Dot */}
                <div className="w-1 h-1 rounded-full bg-[#8FB69A]/80 animate-pulse" />
              </div>
            </div>

            {/* Laptop macOS-style Window / Browser Chrome Bar */}
            <div className="hidden md:flex items-center justify-between px-4 py-2 bg-[#141815] border-b border-[#2C372F]">
              {/* Traffic Light Window Controls */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] inline-block shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] inline-block shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] inline-block shadow-sm" />
              </div>

              {/* URL Address Bar */}
              <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-[#111312] border border-[#2F3A31] text-[11px] font-mono text-[#B8B8AD] shadow-inner max-w-sm w-full justify-center">
                <Lock size={11} className="text-[#8FB69A]" />
                <span className="text-[#F1EDE3] font-medium">https://c7-coach.sports-science.app</span>
              </div>

              {/* View Switcher shortcut right in laptop header */}
              <button
                type="button"
                onClick={() => onToggleDevice('phone')}
                title="Switch to Phone View"
                className="flex items-center gap-1 text-[11px] font-mono text-[#B8B8AD] hover:text-[#8FB69A] cursor-pointer transition-colors"
              >
                <Smartphone size={12} />
                <span>Phone Mode</span>
              </button>
            </div>

            {/* Laptop Display Inner Screen Content */}
            <div className="w-full min-h-screen md:min-h-[720px] md:max-h-[82vh] bg-[#171C19] relative flex flex-col overflow-hidden">
              {children}
            </div>
          </div>

          {/* Laptop Hinge & Keyboard Deck Base */}
          <div className="hidden md:flex flex-col w-[102%] -mt-0.5">
            {/* Metallic Hinge Strip */}
            <div className="h-2.5 bg-gradient-to-b from-[#141815] to-[#1F2520] border-t border-[#2F3A31] w-full" />

            {/* Laptop Base Deck with Opening Notch */}
            <div className="h-5 bg-gradient-to-b from-[#232A25] to-[#181D19] border-x border-b border-[#2C382F] rounded-b-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] relative flex items-start justify-center">
              {/* Thumb Notch Indent */}
              <div className="w-28 h-2 bg-[#121613] rounded-b-md border-b border-[#303832]/60 shadow-inner" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
