import * as React from 'react'
import { Link } from 'react-router-dom'
import { useState } from "react";
// 1. ADD signInWithGoogle TO IMPORTS
import { register, signInWithGoogle } from "../firebase/config"; 
import { toast } from "react-toastify";


const _RegisterForm = () => {
  const [username,setUsername] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  
  //  password visibility
  const [showPassword, setShowPassword] = useState(false);

  const user_auth = async (event) => {
    event.preventDefault();
    await register(username, email, password);
  }


  const handleGoogleLogin = async () => {
    try {
        await signInWithGoogle();
    } catch (error) {
        console.error(error);
        toast.error("Google login failed");
    }
  }

  return (
     <div className='bg-white px-20 py-20 rounded-3xl border-2 border-gray'>

      <h1 className='text-3xl font-semibold mb-4'>Sign Up</h1>

      <div className='mt-8'>
        <div>
          <label className='text-lg font-medium'>Username</label>
          <input
              className='w-full border-2 border-gray-100 rounded-xl p-2 mt-1 bg-transparent'
              onChange={(e)=>{setUsername(e.target.value)}} value={username} placeholder='Enter your username'  
          />
        </div>
        <div>
          <label className='text-lg font-medium'>Email</label>
          <input
              className='w-full border-2 border-gray-100 rounded-xl p-2 mt-1 bg-transparent'
              onChange={(e)=>{setEmail(e.target.value)}} value={email} placeholder='Enter your email'  
          />
        </div>
        
        <div className="mt-4">
          <label className='text-lg font-medium'>Password</label>
          
          <div className="relative">
              <input
                  type={showPassword ? "text" : "password"}
                  className='w-full border-2 border-gray-100 rounded-xl p-2 mt-1 bg-transparent pr-10'
                  onChange={(e)=>{setPassword(e.target.value)}} value={password} placeholder='Enter your password'  
              />
              <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-4 text-gray-500 hover:text-violet-500"
              >
                  {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                  )}
              </button>
          </div>
        </div>
      </div>
      

      <div className='mt-8 flex flex-col gap-y-4'>
        <button onClick={user_auth} className='py-2 rounded-xl bg-violet-500 text-white text-lg font-bold'>Sign Up</button>
        <button 
            type="button"
            onClick={handleGoogleLogin}
            className='py-2 rounded-xl bg-white border-2 border-violet-500 text-violet-500 text-lg font-bold'
        >
            Sign up with Google
        </button>
      </div>
      

      <div className='mt-8 flex justify-center items-center'>
        <p className='font-medium text-base'>Already have an account?</p>
        <Link to = "/login" className='text-violet-500 text-base font-medium ml-2'>Login</Link>
      </div>

    </div>
  )
}

export default _RegisterForm;