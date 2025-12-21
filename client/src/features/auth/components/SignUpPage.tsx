import { FaGoogle } from "react-icons/fa";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../core/components/ui/card";
import { Button } from "../../core/components/ui/button";
import { Label } from "../../core/components/ui/label";
import { Input } from "../../core/components/ui/input";
import { useSignup } from "../hooks/useSignup";
import { Link } from "react-router";

function SignUpPage() {
  const { handleSubmit, myForm, handleChange, error, loading } = useSignup();

  return (
    <div className="flex justify-center items-center mt-40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign Up to register</CardTitle>
          <CardDescription>Already have an account?</CardDescription>
          <CardAction>
            <Button
              variant="link"
              className=" text-white bg-[#065f46] hover:bg-[#0a7b5b]"
            >
              <Link to={"/login"}>Log In</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="username">Username:</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="alice123"
                  name="username"
                  value={myForm.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
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
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={myForm.password}
                  name="password"
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#065f46] hover:bg-[#0a7b5b]"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
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
            disabled={loading}
          >
            <FaGoogle />
            Login with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SignUpPage;
