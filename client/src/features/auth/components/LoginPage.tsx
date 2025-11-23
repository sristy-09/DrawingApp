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

function LoginPage() {
  const { myForm, handleChange, handleSubmit } = useLogin();
  return (
    <div className="flex justify-center items-center mt-40">
      <Card className="w-full max-w-sm ">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Don't have an account?</CardDescription>
          <CardAction>
            <Button
              variant="link"
              className="bg-[#065f46] hover:bg-[#0a7b5b] text-white"
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
              </div>

              <Button
                type="submit"
                className="w-full bg-[#065f46] hover:bg-[#0a7b5b]"
              >
                Login
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            onClick={() =>
              window.open("http://localhost:3000/auth/google", "_self")
            }
            variant="outline"
            className="w-full"
          >
            <FaGoogle />
            Login with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default LoginPage;
