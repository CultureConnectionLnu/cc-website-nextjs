"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { BackgroundAchievements } from "@/components/Background";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AchievementBadge from "@/components/Achievements/AchievementBadge";
import AchievementModal from "@/components/Achievements/AchievementModal";
import AddEditAchievementModal from "@/components/Achievements/AddEditAchievementModal";
import QRCodeGrantModal from "@/components/Achievements/QRCodeGrantModal";
import ScannerModal from "@/components/ScannerModal";
import FavoriteBadgeSelectionModal from "@/components/Achievements/FavoriteBadgeSelectionModal";
import CardSkinSelectionModal from "@/components/Achievements/CardSkinSelectionModal";
import UserIdentityQrModal from "@/components/UserIdentityQrModal";
import UserProfileModal from "@/components/Achievements/UserProfileModal";
import BecomeMemberModal from "@/components/BecomeMemberModal";
import { AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faQrcode,
  faStar,
  faPalette,
  faIdBadge,
  faPlus,
  faFilter,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import Footer from "@/components/Footer";

const fetchAchievements = async () => {
  const response = await fetch("/api/achievements");
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch achievements. Status: ${response.status}. ${errorData}`,
    );
  }
  return response.json();
};

const createAchievement = async (newAchievementData) => {
  const response = await fetch("/api/achievements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newAchievementData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorData.message || "Failed to create achievement");
  }
  return response.json();
};

const editAchievement = async (updatedAchievementData) => {
  const response = await fetch("/api/achievements", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedAchievementData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorData.message || "Failed to update achievement");
  }
  return response.json();
};

const deleteAchievement = async (achievementId) => {
  const response = await fetch(`/api/achievements?id=${achievementId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorData.message || "Failed to delete achievement");
  }
  return response.json();
};

const patchUserAchievement = async (payload) => {
  let body = { ...payload };
  if (!body.action || !body.achievementId || !body.targetUserId) {
    throw new Error("Invalid payload for patchUserAchievement");
  }

  const response = await fetch("/api/achievements", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorData.message || `Failed to ${body.action}`);
  }
  return response.json();
};

const fetchAllUsers = async () => {
  const response = await fetch("/api/user");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorData.message || "Failed to fetch users");
  }
  return response.json();
};

const scanQrCodeApi = async (scannedData) => {
  const response = await fetch("/api/qr/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scannedData }),
  });
  const result = await response.json();
  if (!response.ok) {
    let errorMessage =
      result.message || `Scan processing failed with status ${response.status}`;
    if (result.cooldownActive) {
      errorMessage = result.message;
    }
    const error = new Error(errorMessage);
    error.cooldownActive = result.cooldownActive || false;
    throw error;
  }
  return result;
};

const fetchUserFavorites = async () => {
  const response = await fetch("/api/user/favorites");
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch favorite badges. Status: ${response.status}. ${errorData}`,
    );
  }
  return response.json();
};

const updateUserFavorite = async ({ achievementId, slotPosition }) => {
  const response = await fetch("/api/user/favorites", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ achievementId, slotPosition }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorData.message || "Failed to update favorite badge.");
  }
  return response.json();
};

const removeUserFavorite = async ({ slotPosition }) => {
  const response = await fetch("/api/user/favorites", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotPosition }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorData.message || "Failed to remove favorite badge.");
  }
  return response.json();
};

const updateUserCardSkin = async ({ achievementIdForSkin }) => {
  const response = await fetch("/api/user/card-skin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ achievementIdForSkin }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorData.message || "Failed to update card skin.");
  }
  return response.json();
};

const PLACEHOLDER_FAVORITE_IMG =
  "https://api2.cultureconnection.se/assets/achievments-badges/9c153840-126c-4ba1-9906-647d1c3a2152.png";

export default function AchievementsPage() {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isFavoriteSelectionModalOpen, setIsFavoriteSelectionModalOpen] =
    useState(false);
  const [isCardSkinModalOpen, setIsCardSkinModalOpen] = useState(false);
  const [isUserIdentityModalOpen, setIsUserIdentityModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isBecomeMemberModalOpen, setIsBecomeMemberModalOpen] = useState(false);

  const [selectedAchievementForDetail, setSelectedAchievementForDetail] =
    useState(null);
  const [achievementToEdit, setAchievementToEdit] = useState(null);
  const [achievementForQrCode, setAchievementForQrCode] = useState(null);
  const [selectedSlotForFavorite, setSelectedSlotForFavorite] = useState(null);
  const [filterMode, setFilterMode] = useState("all");
  const [viewedUserProfile, setViewedUserProfile] = useState(null);
  const [isUserProfileLoading, setIsUserProfileLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (isUserLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isUserLoaded, isSignedIn, router]);

  const canManage =
    isUserLoaded &&
    user &&
    (user.publicMetadata?.admin === true ||
      user.publicMetadata?.committee === true);
  const isAdmin = isUserLoaded && user && user.publicMetadata?.admin === true;
  const isMember = isUserLoaded && user && user.publicMetadata?.member === true;
  const isSimpleUser =
    isUserLoaded && isSignedIn && user && !isMember && !canManage;

  const {
    data: achievementsData,
    isLoading: isAchievementsLoading,
    isError: isAchievementsError,
    error: achievementsError,
  } = useQuery({
    queryKey: ["achievements"],
    queryFn: fetchAchievements,
    enabled: isUserLoaded && isSignedIn,
  });

  const {
    data: allUsersData,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
  } = useQuery({
    queryKey: ["allUsers"],
    queryFn: fetchAllUsers,
    enabled: !!(isUserLoaded && isSignedIn && canManage),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: userFavoritesData, isLoading: isLoadingFavorites } = useQuery({
    queryKey: ["userFavorites"],
    queryFn: fetchUserFavorites,
    enabled: !!(isUserLoaded && isSignedIn),
  });

  const commonMutationOptions = (successMessage) => ({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      if (successMessage) toast.success(successMessage);
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
      toast.error(`Error: ${error.message}`);
    },
  });

  const createAchievementMutation = useMutation({
    mutationFn: createAchievement,
    ...commonMutationOptions("Achievement created!"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      closeAddEditModal();
      toast.success("Achievement created!");
    },
  });

  const editAchievementMutation = useMutation({
    mutationFn: editAchievement,
    ...commonMutationOptions("Achievement updated!"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      closeAddEditModal();
      toast.success("Achievement updated!");
    },
  });

  const deleteAchievementMutation = useMutation({
    mutationFn: deleteAchievement,
    ...commonMutationOptions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      toast.success(data.message || "Achievement deleted.");
    },
  });

  const patchUserAchievementMutation = useMutation({
    mutationFn: patchUserAchievement,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      toast.success(
        data.message ||
          `User achievement status updated for ${variables.action}.`,
      );
    },
    onError: (error) => {
      console.error("Patch user achievement failed:", error);
      toast.error(`Update failed: ${error.message}`);
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });

  const scanQrCodeMutation = useMutation({
    mutationFn: scanQrCodeApi,
    onSuccess: (data) => {
      toast.success(data.message || "Scan processed successfully!");
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      closeScannerModal();
    },
    onError: (error) => {
      console.error("Scan mutation failed:", error);
      let toastMessage = `Scan Error: ${error.message}`;
      if (error.cooldownActive) {
        toastMessage = error.message;
      }
      toast.error(toastMessage);
    },
  });

  const setFavoriteMutation = useMutation({
    mutationFn: updateUserFavorite,
    ...commonMutationOptions("Favorite badge updated!"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userFavorites"] });
      toast.success("Favorite badge updated!");
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: removeUserFavorite,
    ...commonMutationOptions("Favorite badge removed!"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userFavorites"] });
      toast.success("Favorite badge removed!");
    },
  });

  const setCardSkinMutation = useMutation({
    mutationFn: updateUserCardSkin,
    ...commonMutationOptions("Card skin updated!"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      if (user && user.reload) {
        user.reload();
      }
      closeCardSkinModal();
      toast.success("Card skin updated!");
    },
  });

  const { groupedAchievements, sortedCategoryNames: allSortedCategoryNames } =
    useMemo(() => {
      if (!achievementsData)
        return { groupedAchievements: {}, sortedCategoryNames: [] };
      const visibleAchievements = achievementsData.filter(
        (ach) => ach.isEnabled || canManage,
      );
      const groups = {};
      const categorySet = new Set();
      let hasUncategorized = false;
      visibleAchievements.forEach((ach) => {
        const category = ach.category || "Uncategorized";
        if (category !== "Uncategorized") {
          categorySet.add(category);
        } else {
          hasUncategorized = true;
        }
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(ach);
      });
      const sortedNames = Array.from(categorySet).sort((a, b) =>
        a.localeCompare(b),
      );
      if (hasUncategorized && groups["Uncategorized"]?.length > 0) {
        sortedNames.push("Uncategorized");
      }
      return { groupedAchievements: groups, sortedCategoryNames: sortedNames };
    }, [achievementsData, canManage]);

  const { displayedAchievements, displayMode, categoriesToDisplay } =
    useMemo(() => {
      if (!achievementsData)
        return {
          displayedAchievements: {},
          displayMode: "loading",
          categoriesToDisplay: [],
        };

      let processedAchievements = achievementsData.filter(
        (ach) => ach.isEnabled || canManage,
      );

      processedAchievements.sort((a, b) => {
        const achievedCompare =
          (b.currentUserAchieved ? 1 : 0) - (a.currentUserAchieved ? 1 : 0);
        if (achievedCompare !== 0) {
          return achievedCompare;
        }
        return a.title.localeCompare(b.title);
      });

      let filteredForDisplay = processedAchievements;
      let finalDisplayMode = filterMode;

      if (filterMode === "achieved") {
        filteredForDisplay = processedAchievements.filter(
          (ach) => ach.currentUserAchieved,
        );
      } else if (filterMode === "uncompleted") {
        filteredForDisplay = processedAchievements.filter(
          (ach) => !ach.currentUserAchieved,
        );
      } else if (filterMode === "available") {
        filteredForDisplay = processedAchievements.filter((ach) => {
          const isLeveled = ach.level_config && ach.level_config.length > 0;
          if (!ach.currentUserAchieved) return true;
          if (ach.currentUserAchieved && isLeveled && !ach.isMaxLevel)
            return true;
          return false;
        });
      } else if (filterMode === "category" && selectedCategory) {
        filteredForDisplay = processedAchievements.filter(
          (ach) => (ach.category || "Uncategorized") === selectedCategory,
        );
      }

      const groups = {};
      filteredForDisplay.forEach((ach) => {
        const category = ach.category || "Uncategorized";
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(ach);
      });

      let categoriesToRender = Object.keys(groups).sort((a, b) => {
        if (a === "Uncategorized") return 1;
        if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
      });

      return {
        displayedAchievements: groups,
        displayMode: finalDisplayMode,
        categoriesToDisplay: categoriesToRender,
      };
    }, [achievementsData, canManage, filterMode, selectedCategory]);

  const achievedBadgesForSelection = useMemo(() => {
    if (!achievementsData) return [];
    return achievementsData.filter((ach) => ach.currentUserAchieved);
  }, [achievementsData]);

  const userDisplayName = useMemo(() => {
    if (!user) return "";
    return (
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.username ||
      user.emailAddresses?.[0]?.emailAddress ||
      ""
    );
  }, [user]);

  const openDetailModal = (achievement) => {
    setSelectedAchievementForDetail(achievement);
    setIsDetailModalOpen(true);
  };
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedAchievementForDetail(null);
  };

  const openAddModal = () => {
    setAchievementToEdit(null);
    setIsAddEditModalOpen(true);
  };
  const openEditModal = (achievement) => {
    setAchievementToEdit(achievement);
    setIsAddEditModalOpen(true);
  };
  const closeAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setAchievementToEdit(null);
  };

  const openQrCodeModal = (achievement) => {
    setAchievementForQrCode(achievement);
    setIsQrCodeModalOpen(true);
    setIsDetailModalOpen(false);
    setSelectedAchievementForDetail(null);
  };
  const closeQrCodeModal = () => {
    setIsQrCodeModalOpen(false);
    setAchievementForQrCode(null);
  };

  const openScannerModal = () => {
    if (!user) {
      toast.error("Please sign in to scan QR codes.");
      return;
    }
    setIsScannerModalOpen(true);
  };
  const closeScannerModal = () => {
    setIsScannerModalOpen(false);
  };

  const openFavoriteSelectionModal = (slot) => {
    setSelectedSlotForFavorite(slot);
    setIsFavoriteSelectionModalOpen(true);
  };
  const closeFavoriteSelectionModal = () => {
    setIsFavoriteSelectionModalOpen(false);
    setSelectedSlotForFavorite(null);
  };

  const openCardSkinModal = () => {
    setIsCardSkinModalOpen(true);
  };
  const closeCardSkinModal = () => {
    setIsCardSkinModalOpen(false);
  };

  const openUserIdentityModal = () => {
    if (!user) {
      toast.error("Please sign in to view your QR code.");
      return;
    }
    setIsUserIdentityModalOpen(true);
  };

  const closeUserIdentityModal = () => {
    setIsUserIdentityModalOpen(false);
  };

  const openBecomeMemberModal = () => {
    setIsBecomeMemberModalOpen(true);
  };
  const closeBecomeMemberModal = () => {
    setIsBecomeMemberModalOpen(false);
  };

  const handleAddEditSubmit = (achievementData) => {
    if (achievementToEdit) {
      editAchievementMutation.mutate(achievementData);
    } else {
      createAchievementMutation.mutate(achievementData);
    }
  };

  const handleDeleteClick = (achievementId) => {
    if (
      confirm(
        `Are you sure you want to delete achievement ${achievementId}? This cannot be undone.`,
      )
    ) {
      deleteAchievementMutation.mutate(achievementId);
      if (selectedAchievementForDetail?.id === achievementId)
        closeDetailModal();
      if (achievementToEdit?.id === achievementId) closeAddEditModal();
      if (achievementForQrCode?.id === achievementId) closeQrCodeModal();
    }
  };

  const handleFilterClick = (mode, category = null) => {
    setFilterMode(mode);
    setSelectedCategory(category);
  };

  const handleScanSuccess = async (decodedText) => {
    closeScannerModal();

    if (decodedText.startsWith("user_")) {
      const userId = decodedText;
      setIsUserProfileLoading(true);
      setIsUserProfileModalOpen(true);
      setViewedUserProfile(null);

      try {
        const response = await fetch(`/api/user/${userId}/profile`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch user profile.");
        }
        const profileData = await response.json();
        setViewedUserProfile(profileData);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast.error(`Error: ${error.message}`);
        setIsUserProfileModalOpen(false);
      } finally {
        setIsUserProfileLoading(false);
      }
    } else {
      if (scanQrCodeMutation.isPending) {
        toast.error("A scan is already in progress.");
        return;
      }
      scanQrCodeMutation.mutate(decodedText);
    }
  };

  const handleScanError = (errorMessage) => {
    toast.error(`Scanner Error: ${errorMessage}`);
    closeScannerModal();
  };

  const handleSelectFavoriteBadge = (achievement, slotPosition) => {
    setFavoriteMutation.mutate({
      achievementId: achievement.id,
      slotPosition,
    });
  };

  const handleRemoveFavoriteBadge = (slotPosition) => {
    removeFavoriteMutation.mutate({ slotPosition });
  };

  const handleSelectCardSkin = (achievementIdForSkin, skinUrl) => {
    setCardSkinMutation.mutate({ achievementIdForSkin });
  };

  const favoriteSlotsDisplay = useMemo(() => {
    const slots = [null, null, null];
    if (userFavoritesData) {
      userFavoritesData.forEach((fav) => {
        if (fav.slot_position >= 1 && fav.slot_position <= 3) {
          slots[fav.slot_position - 1] = fav;
        }
      });
    }
    return slots;
  }, [userFavoritesData]);

  useEffect(() => {
    const bodyShouldLock =
      isDetailModalOpen ||
      isAddEditModalOpen ||
      isQrCodeModalOpen ||
      isScannerModalOpen ||
      isFavoriteSelectionModalOpen ||
      isCardSkinModalOpen ||
      isUserIdentityModalOpen ||
      isUserProfileModalOpen ||
      isBecomeMemberModalOpen;

    if (bodyShouldLock) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [
    isDetailModalOpen,
    isAddEditModalOpen,
    isQrCodeModalOpen,
    isScannerModalOpen,
    isFavoriteSelectionModalOpen,
    isCardSkinModalOpen,
    isUserIdentityModalOpen,
    isUserProfileModalOpen,
    isBecomeMemberModalOpen,
  ]);

  if (!isUserLoaded) {
    return (
      <div className="text-center p-10 mt-40 text-xl">Loading page...</div>
    );
  }
  if (isUserLoaded && !isSignedIn) {
    return (
      <div className="text-center p-10 mt-40 text-xl">
        Redirecting to homepage...
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <BackgroundAchievements />
      <div className="relative z-10 p-4 md:p-8 mt-24 md:mt-32">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 className="text-5xl md:text-7xl font-Header text-mainColor font-bold text-center mx-auto sm:text-center flex-grow">
              Achievement Board
            </h1>
          </div>

          {user && !isLoadingFavorites && !isSimpleUser && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center">
                My Favorite Badges{" "}
                <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
              </h2>
              <div className="flex justify-center items-center gap-3 md:gap-5 p-3 bg-gray-100 rounded-lg shadow">
                {favoriteSlotsDisplay.map((fav, index) => (
                  <button
                    key={index}
                    onClick={() => openFavoriteSelectionModal(index + 1)}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-dashed border-gray-400 hover:border-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-150 ease-in-out flex items-center justify-center overflow-hidden bg-gray-200 hover:bg-gray-300 group"
                    title={
                      fav
                        ? `Change favorite: ${fav.title}`
                        : `Select favorite for slot ${index + 1}`
                    }
                  >
                    <img
                      src={fav ? fav.imgurl : PLACEHOLDER_FAVORITE_IMG}
                      alt={fav ? fav.title : `Favorite slot ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER_FAVORITE_IMG;
                      }}
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mx-auto flex flex-col items-center space-y-3 mb-8">
            {user && (
              <>
                {isSimpleUser ? (
                  <>
                    <button
                      onClick={openBecomeMemberModal}
                      className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-yellow-200 text-yellow-800 font-semibold hover:bg-yellow-300"
                      title="Become a Member"
                      aria-label="Become a Member"
                    >
                      <FontAwesomeIcon icon={faUserPlus} className="h-5 w-5" />
                      Become a Member
                    </button>
                    <p className="text-xl text-gray-700 mt-3 text-center">
                      Become a member to achieve some badges!
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={openCardSkinModal}
                      className="flex px-4 py-2 w-64 bg-purple-300 font-bold justify-center text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 items-center gap-2"
                      title="Select Card Skin"
                      aria-label="Select Card Skin"
                    >
                      Card Skin{" "}
                      <FontAwesomeIcon icon={faPalette} className="h-5 w-5" />
                    </button>
                    <button
                      onClick={openScannerModal}
                      className="flex px-4 py-2 w-64 bg-green-300 font-bold justify-center text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 items-center gap-2"
                      title="Scan Achievement QR Code"
                      aria-label="Scan Achievement QR Code"
                      disabled={!isUserLoaded}
                    >
                      QR Code Scanner{" "}
                      <FontAwesomeIcon icon={faQrcode} className="h-5 w-5" />
                    </button>
                    <button
                      onClick={openUserIdentityModal}
                      className="flex px-4 py-2 w-64 bg-sky-300 font-bold justify-center text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 items-center gap-2"
                      title="Show My Identity QR Code"
                      aria-label="Show My Identity QR Code"
                      disabled={!isUserLoaded}
                    >
                      My Identity QR{" "}
                      <FontAwesomeIcon icon={faIdBadge} className="h-5 w-5" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {!isAchievementsLoading &&
            !isAchievementsError &&
            (achievementsData?.length > 0 ||
              allSortedCategoryNames.length > 0) && (
              <div className="flex flex-wrap justify-center gap-2 mb-8 px-4">
                <button
                  onClick={() => handleFilterClick("all")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
                           ${
                             filterMode === "all"
                               ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                               : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                           }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleFilterClick("achieved")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500
                           ${
                             filterMode === "achieved"
                               ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                               : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                           }`}
                >
                  My Badges
                </button>
                <button
                  onClick={() => handleFilterClick("uncompleted")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500
                           ${
                             filterMode === "uncompleted"
                               ? "bg-gray-600 text-white border-gray-700 shadow-sm"
                               : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                           }`}
                >
                  Uncompleted
                </button>
                {allSortedCategoryNames.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleFilterClick("category", category)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
                             ${
                               filterMode === "category" &&
                               selectedCategory === category
                                 ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                                 : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                             }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          {canManage && (
            <button
              onClick={openAddModal}
              className="flex my-10 px-4 py-2 mx-auto w-64 bg-blue-400 font-bold justify-center text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 items-center gap-2"
              disabled={createAchievementMutation.isPending}
            >
              <FontAwesomeIcon icon={faPlus} /> Add Badge
            </button>
          )}

          {isAchievementsLoading && (
            <p className="text-center text-gray-500 text-lg">
              Loading badges...
            </p>
          )}
          {isAchievementsError && (
            <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-300">
              Error loading badges:{" "}
              {achievementsError instanceof Error
                ? achievementsError.message
                : "Unknown error"}
            </p>
          )}
          {!isAchievementsLoading &&
            !isAchievementsError &&
            categoriesToDisplay.length === 0 && (
              <p className="text-center text-gray-500 text-lg mt-10">
                {filterMode === "achieved"
                  ? "You haven't achieved any badges yet!"
                  : filterMode === "uncompleted"
                    ? "No uncompleted badges found (Great job!)"
                    : filterMode === "available"
                      ? "No badges currently available for you to earn or progress on."
                      : filterMode === "category" && selectedCategory
                        ? `No badges found in the '${selectedCategory}' category for the current filter.`
                        : "No achievement badges found."}
              </p>
            )}

          {!isAchievementsLoading &&
            !isAchievementsError &&
            categoriesToDisplay.length > 0 && (
              <>
                {categoriesToDisplay.map((category) => (
                  <section key={category} className="mb-12">
                    <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 border-b-2 border-gray-300 pb-2 mb-6">
                      {category}
                    </h2>
                    <div className="bg-gray-400/80 p-4 md:p-6 rounded-lg shadow-xl border-4 border-gray-900/50">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 justify-items-center">
                        {displayedAchievements[category]?.map((achievement) => (
                          <AchievementBadge
                            key={achievement.id}
                            achievement={achievement}
                            isAdminView={canManage}
                            onOpenModal={openDetailModal}
                          />
                        ))}
                        {(!displayedAchievements[category] ||
                          displayedAchievements[category].length === 0) && (
                          <p className="col-span-full text-center text-gray-700 italic">
                            No badges in this category for the current filter.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                ))}
              </>
            )}
        </main>
      </div>
      <Footer />

      <AchievementModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        achievementData={selectedAchievementForDetail}
        isAdminOrCommittee={canManage}
        onEdit={() =>
          selectedAchievementForDetail &&
          openEditModal(selectedAchievementForDetail)
        }
        onDelete={() =>
          selectedAchievementForDetail &&
          handleDeleteClick(selectedAchievementForDetail.id)
        }
        onOpenQrCodeModal={() =>
          selectedAchievementForDetail &&
          openQrCodeModal(selectedAchievementForDetail)
        }
      />

      <AddEditAchievementModal
        isOpen={isAddEditModalOpen}
        onClose={closeAddEditModal}
        onSubmit={handleAddEditSubmit}
        initialData={achievementToEdit}
        isLoading={
          createAchievementMutation.isPending ||
          editAchievementMutation.isPending
        }
        error={
          createAchievementMutation.error?.message ||
          editAchievementMutation.error?.message
        }
        availableCategories={allSortedCategoryNames.filter(
          (cat) => cat !== "Uncategorized",
        )}
      />

      <QRCodeGrantModal
        isOpen={isQrCodeModalOpen}
        onClose={closeQrCodeModal}
        achievementData={achievementForQrCode}
        patchUserMutation={patchUserAchievementMutation}
        isAdmin={isAdmin}
        usersData={allUsersData}
        isLoadingUsers={isLoadingUsers}
        isUsersError={isUsersError}
        usersError={usersError}
      />

      <ScannerModal
        isOpen={isScannerModalOpen}
        onClose={closeScannerModal}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
      />

      <FavoriteBadgeSelectionModal
        isOpen={isFavoriteSelectionModalOpen}
        onClose={closeFavoriteSelectionModal}
        achievedBadges={achievedBadgesForSelection}
        onSelectBadge={handleSelectFavoriteBadge}
        onRemoveFavorite={handleRemoveFavoriteBadge}
        currentSlot={selectedSlotForFavorite}
        currentFavoriteInSlot={
          selectedSlotForFavorite
            ? favoriteSlotsDisplay[selectedSlotForFavorite - 1]
            : null
        }
      />
      <CardSkinSelectionModal
        isOpen={isCardSkinModalOpen}
        onClose={closeCardSkinModal}
        achievementsData={achievementsData}
        onSelectSkin={handleSelectCardSkin}
        currentSelectedSkinUrl={user?.publicMetadata?.selectedCardSkinUrl}
        isLoading={setCardSkinMutation.isPending}
      />
      <UserIdentityQrModal
        isOpen={isUserIdentityModalOpen}
        onClose={closeUserIdentityModal}
        userName={userDisplayName}
      />
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        profileData={viewedUserProfile}
        isLoading={isUserProfileLoading}
      />
      <BecomeMemberModal
        isOpen={isBecomeMemberModalOpen}
        onClose={closeBecomeMemberModal}
        user={user}
      />
    </>
  );
}
