"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faQrcode,
  faIdCardClip,
  faBars,
  faTimes,
  faChevronDown,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  useUser,
  UserButton,
} from "@clerk/nextjs";

import SocialIcons from "./Socialmedia";
import Linktree from "./Linktree";
import UserCardModal from "./UserCardModal";
import BecomeMemberModal from "./BecomeMemberModal";
import UserIdentityQrModal from "@/components/UserIdentityQrModal";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktopSideMenuOpen, setIsDesktopSideMenuOpen] = useState(false);

  const [isUserCardModalOpen, setIsUserCardModalOpen] = useState(false);
  const [isBecomeMemberModalOpen, setIsBecomeMemberModalOpen] = useState(false);
  const [isUserIdentityModalOpen, setIsUserIdentityModalOpen] = useState(false);

  const { user, isLoaded, isSignedIn } = useUser();

  const isAdmin =
    isLoaded && isSignedIn && user?.publicMetadata?.admin === true;
  const isCommittee =
    isLoaded && isSignedIn && user?.publicMetadata?.committee === true;
  const isMember =
    isLoaded && isSignedIn && user?.publicMetadata?.member === true;
  const isRegularUser =
    isLoaded && isSignedIn && !isMember && !isCommittee && !isAdmin;

  const userDisplayName = useMemo(() => {
    if (!user) return "";
    return (
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.username ||
      "User"
    );
  }, [user]);

  const sidePanelVariants = {
    hidden: { x: "-100%" },
    visible: { x: "0%" },
    exit: { x: "-100%" },
  };

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setIsDesktopSideMenuOpen(false);
  };

  const openMenu = () => {
    setMobileMenuOpen(true);
    setIsDesktopSideMenuOpen(true);
  };

  return (
    <>
      <motion.header className="fixed top-6 left-0 right-0 z-40 px-4">
        <div className="max-w-[95%] md:max-w-[85%] mx-auto bg-mainColor border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full pl-3 py-1 pr-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="md:flex hidden items-center">
              <img
                src="/cc.svg"
                alt="Logo"
                className="w-14 h-14 rounded-full"
              />
            </Link>
            <button
              onClick={openMenu}
              className="text-white p-2 hover:scale-110 transition-transform"
            >
              <FontAwesomeIcon icon={faBars} className="text-3xl" />
            </button>
          </div>

          <div className="flex items-center gap-6 md:gap-8">
            <SignedIn>
              <div className="flex items-center gap-4 md:gap-6">
                {isRegularUser && (
                  <button
                    onClick={() => setIsBecomeMemberModalOpen(true)}
                    className="hidden md:flex bg-[#4ade80] text-black px-4 py-1.5 rounded-full border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 hover:bg-[#22c55e] transition-all items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUserPlus} />
                    <span>Become a Member</span>
                  </button>
                )}

                <button
                  onClick={() => setIsUserCardModalOpen(true)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={faIdCardClip}
                    className="text-2xl md:text-3xl"
                  />
                </button>

                <button
                  onClick={() => setIsUserIdentityModalOpen(true)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={faQrcode}
                    className="text-2xl md:text-3xl"
                  />
                </button>

                <div className="border-l-2 border-white/20 pl-4 scale-110">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-white text-black px-6 py-2.5 rounded-full border-2 border-black font-Main font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 hover:bg-gray-100 transition-all">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {(mobileMenuOpen || isDesktopSideMenuOpen) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenus}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />

            <motion.nav
              variants={sidePanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-full md:w-[400px] bg-mainColor z-[60] flex flex-col shadow-2xl border-r-4 border-black"
            >
              <div className="px-8 pt-4 flex justify-between items-center border-b border-white/20">
                <div className="flex items-center gap-3">
                  <img src="/cc.svg" className="w-20 h-20 rounded-full" />
                  <span className="text-white text-3xl font-bold uppercase">
                    Menu
                  </span>
                </div>
                <button
                  onClick={closeMenus}
                  className="text-white p-2 hover:rotate-90 transition-transform duration-300"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-4xl" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto px-10 py-10 flex flex-col gap-8 text-3xl font-bold text-white uppercase">
                <Link
                  href="/"
                  onClick={closeMenus}
                  className="hover:translate-x-2 transition-transform"
                >
                  Home
                </Link>
                <Link
                  href="/about-us"
                  onClick={closeMenus}
                  className="hover:translate-x-2 transition-transform"
                >
                  About Us
                </Link>
                <Link
                  href="/events"
                  onClick={closeMenus}
                  className="hover:translate-x-2 transition-transform"
                >
                  Events
                </Link>

                <SignedIn>
                  {isRegularUser && (
                    <button
                      onClick={() => {
                        setIsBecomeMemberModalOpen(true);
                        closeMenus();
                      }}
                      className="text-left text-[#4ade80] hover:translate-x-2 transition-transform flex items-center gap-3"
                    >
                      <FontAwesomeIcon icon={faUserPlus} /> Become a Member
                    </button>
                  )}

                  {(isMember || isCommittee || isAdmin) && (
                    <>
                      <Link
                        href="/gallery"
                        onClick={closeMenus}
                        className="hover:translate-x-2 transition-transform"
                      >
                        Gallery
                      </Link>
                      <Link
                        href="/achievements"
                        onClick={closeMenus}
                        className="hover:translate-x-2 transition-transform"
                      >
                        Badges
                      </Link>
                      <Link
                        href="/flag-game"
                        onClick={closeMenus}
                        className="text-blue-200 hover:translate-x-2 transition-transform"
                      >
                        Flag Game
                      </Link>
                    </>
                  )}
                  {(isAdmin || isCommittee) && (
                    <Link
                      href="/admin"
                      onClick={closeMenus}
                      className="text-yellow-400 hover:translate-x-2 transition-transform"
                    >
                      Admin Panel
                    </Link>
                  )}
                </SignedIn>

                <div className="w-full pt-6 border-t border-white/20">
                  <Linktree />
                </div>
              </div>

              <div className="mt-auto pb-6 pt-2 px-6 border-t border-white/10">
                <SocialIcons />
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <UserCardModal
        isOpen={isUserCardModalOpen}
        onClose={() => setIsUserCardModalOpen(false)}
        user={user}
      />
      <BecomeMemberModal
        isOpen={isBecomeMemberModalOpen}
        onClose={() => setIsBecomeMemberModalOpen(false)}
        user={user}
      />
      <UserIdentityQrModal
        isOpen={isUserIdentityModalOpen}
        onClose={() => setIsUserIdentityModalOpen(false)}
        userName={userDisplayName}
      />
    </>
  );
}
