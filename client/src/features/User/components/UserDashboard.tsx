import { useEffect } from "react";
import BoardList from "../../board-list/components/BoardList";
import { useUserDashboard } from "../hooks/useUserDashboard";
import { Plus, Palette, Grid3x3 } from "lucide-react";
import { Button } from "../../core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../core/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../../core/components/ui/avatar";
import { CreateBoardModal } from "./CreateBoardModal";
import { SaveGuestBoardDialog } from "../../auth/components/SaveGuestBoardDialog";
import { FaSignOutAlt } from "react-icons/fa";

function UserDashboard() {
  const {
    user,
    boards,
    newBoard,
    setNewBoard,
    showNewBoardForm,
    setShowNewBoardForm,
    showSaveDialog,
    fetchBoards,
    createBoard,
    handleLogout,
    handleBoardDeleted,
    handleSaveGuestBoard,
    handleDiscardGuestBoard,
    handleCancelSaveDialog,
  } = useUserDashboard();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchBoards();
  }, []);

  const getUserInitials = () => {
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold leading-none">DrawBoard</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Creative workspace
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      {user.username || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <FaSignOutAlt className="mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-6 py-8">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-1">
                Welcome back, {user.username || "Creator"}!
              </h2>
              <p className="text-muted-foreground">
                {boards.length === 0
                  ? "Create your first board to get started"
                  : `${boards.length} board${boards.length === 1 ? "" : "s"} in your workspace`}
              </p>
            </div>
            <Button
              onClick={() => setShowNewBoardForm(true)}
              size="lg"
              className="h-11 px-6 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Board
            </Button>
          </div>
        </div>

        {/* Boards Section */}
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-950 dark:to-fuchsia-950 p-6 mb-6">
              <Grid3x3 className="h-12 w-12 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No boards yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md">
              Start creating amazing drawings and diagrams. Your boards will appear here.
            </p>
            <Button
              onClick={() => setShowNewBoardForm(true)}
              size="lg"
              className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 text-white"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Board
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Grid3x3 className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Your Boards</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {boards.map((board) => (
                <BoardList
                  key={board._id}
                  board={board}
                  currentUserId={user._id}
                  onBoardDeleted={handleBoardDeleted}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      <CreateBoardModal
        open={showNewBoardForm}
        onClose={() => setShowNewBoardForm(false)}
        onSubmit={createBoard}
        boardData={newBoard}
        setBoardData={setNewBoard}
      />

      {/* Save Guest Board Dialog */}
      <SaveGuestBoardDialog
        open={showSaveDialog}
        onSave={handleSaveGuestBoard}
        onDiscard={handleDiscardGuestBoard}
        onCancel={handleCancelSaveDialog}
      />
    </div>
  );
}

export default UserDashboard;
