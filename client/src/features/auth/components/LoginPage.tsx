import { Button } from "../../core/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../core/components/ui/card";
import { Input } from "../../core/components/ui/input";
import { Label } from "../../core/components/ui/label";
import { FaGoogle } from "react-icons/fa";
import { Link } from "react-router";
import { useLogin } from "../hooks/useLogin";
import { SaveGuestBoardDialog } from "./SaveGuestBoardDialog";

function LoginPage() {
  const {
    myForm,
    handleChange,
    handleSubmit,
    errors,
    showSaveDialog,
    handleSaveGuestBoard,
    handleDiscardGuestBoard,
    handleCancelSaveDialog,
  } = useLogin();

  const API_URL = import.meta.env.VITE_API_URL;
  return (
    <>
      <SaveGuestBoardDialog
        open={showSaveDialog}
        onSave={handleSaveGuestBoard}
        onDiscard={handleDiscardGuestBoard}
        onCancel={handleCancelSaveDialog}
      />
      <div className="flex justify-center items-center mt-40">
      <Card className="w-full max-w-sm ">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Don't have an account?</CardDescription>
          <CardAction>
            <Button
              variant="link"
              className="bg-[#c084fc] hover:bg-[#6b21a8] text-white"
            >
              <Link to={"/signup"}>Sign Up</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  name="email"
                  value={myForm.email}
                  onChange={handleChange}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={myForm.password}
                  onChange={handleChange}
                  required
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#c084fc] hover:bg-[#6b21a8]"
              >
                Login
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            onClick={() => window.open(`${API_URL}/auth/google`, "_self")}
            variant="outline"
            className="w-full"
          >
            <FaGoogle />
            Login with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}

export default LoginPage;
