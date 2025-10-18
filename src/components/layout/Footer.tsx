/**
 * Footer component - redesigned to match the provided image
 */

import React from 'react';
import { 
    DownloadOutlined, InstagramOutlined, MailOutlined, UsergroupAddOutlined, ChromeOutlined
} from "@ant-design/icons";
import { LogoComponent } from "@/components/ui/Logo";
import Link from "next/link";

interface CustomLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

const CustomLink: React.FC<CustomLinkProps> = ({ href, className, children }) => (
  <Link href={href} className={className}>
    {children}
  </Link>
);

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const activeColor = '#4CBFB6'; 
  
  const ContactIcons = [
      { icon: <InstagramOutlined />, href: "#instagram" },
      { icon: <MailOutlined />, href: "mailto:apsas@gmail.com" },
      { icon: <UsergroupAddOutlined />, href: "#community" },
      { icon: <ChromeOutlined />, href: "#chrome-extension" },
  ];

  return (
      <footer className="bg-[#23263A] text-white w-full">
          <div className=" text-center pb-10">
              
              {/* Container tổng: Logo và Columns xuống dòng và căn giữa */}
              <div className="flex flex-col gap-10 items-center">
                  
                  {/* KHỐI 1: Logo + tagline - Cân giữa */}
                  <div className="flex items-center justify-center gap-4">
                      <LogoComponent size='large' />
                      <div className="h-8 w-px bg-white/25" />
                      <div className="text-sm leading-5 opacity-90" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          <div className="font-semibold">Automated Programming</div>
                          <div className="">Skills Assessment System</div>
                      </div>
                  </div>

                  {/* KHỐI 2: Columns (APSAS, Contact, Download) - Căn giữa */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-16 max-w-2xl mx-auto w-full">
                      {/* Column: APSAS */}
                      <div className="text-left">
                          <h4 className="text-lg font-semibold mb-4 opacity-90" style={{ fontFamily: 'Poppins, sans-serif' }}>APSAS</h4>
                          <div className="space-y-3 text-sm opacity-80">
                              <CustomLink href="mailto:apsas@gmail.com" className="hover:opacity-100 hover:underline underline-offset-4 block">apsas@gmail.com</CustomLink>
                              <div>+84123456789</div>
                              <div>Thu Duc, Ho Chi Minh</div>
                          </div>
                      </div>

                      {/* Column: Contact (Icons) - ĐÃ SỬA ĐỔI SANG GRID 2x2 */}
                      <div className="text-left">
                          <h4 className="text-lg font-semibold mb-4 opacity-90" style={{ fontFamily: 'Poppins, sans-serif' }}>Contact</h4>
                          
                          {/* DÙNG GRID 2 CỘT */}
                          <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-2xl opacity-80 justify-items-start w-fit">
                              {ContactIcons.map((item, index) => (
                                  <CustomLink 
                                      key={index} 
                                      href={item.href} 
                                      className='hover:text-white transition-colors flex items-center justify-center'
                                  >
                                      {item.icon}
                                  </CustomLink>
                              ))}
                          </div>
                      </div>

                      {/* Column: Download */}
                      <div className="text-left col-span-1">
                          <h4 className="text-lg font-semibold mb-4 opacity-90" style={{ fontFamily: 'Poppins, sans-serif' }}>Download</h4>
                          <button 
                              className="inline-flex items-center gap-2 rounded-lg bg-black px-8 py-4 text-lg font-medium text-white border border-white/20 hover:bg-black/90 transition-colors"
                          >
                              Download now <DownloadOutlined />
                          </button>
                      </div>
                  </div>
              </div>

              {/* Dòng Copyright */}
              <div className="mt-24 border-t border-white/10 pt-10 text-center text-sm opacity-70">
                  © {currentYear} APSAS. All rights reserved.
              </div>
          </div>

          
      </footer>
  );
};  