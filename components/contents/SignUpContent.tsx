"use client"
import Link from 'next/link';
import React, { useState } from 'react'
import Loader from '../Loader';
import toast from 'react-hot-toast';
import { Timestamp, addDoc, collection } from "firebase/firestore";
import { auth, fireDB } from "../../firebase/FirebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from 'next/navigation';

type role = "admin" | "user"

export interface userI {
    name: string,
    email: string,
    password: string,
    role?: role
}

const SignUpContent = () => {
    const [loading, setLoading] = useState(false);

    // navigate 
    const navigate = useRouter();

    // User Signup State 
    const [userSignup, setUserSignup] = useState<userI>({
        name: "",
        email: "",
        password: "",
        role: "user"
    });

    const userSignupFunction = async () => {
        // validation 
        if (userSignup.name === "" || userSignup.email === "" || userSignup.password === "") {
            return toast.error("All Fields are required")
        }

        setLoading(true);
        try {
            const users = await createUserWithEmailAndPassword(auth, userSignup.email, userSignup.password);

            // create user object
            const user = {
                name: userSignup.name,
                email: users.user.email,
                uid: users.user.uid,
                role: userSignup.role,
                time: Timestamp.now(),
                date: new Date().toLocaleString(
                    "en-US",
                    {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                    }
                )
            }

            // create user Refrence
            const userRefrence = collection(fireDB, "user")

            // Add User Detail
            await addDoc(userRefrence, user);

            setUserSignup({
                name: "",
                email: "",
                password: ""
            })

            toast.success("Signup Successfully");

            setLoading(false);
            navigate.push('/login')
        } catch (error: any) {
            toast.error(error.message);
            console.log(error);
            setLoading(false);
        }

    }
    return (
        <div className='flex justify-center items-center h-screen'>
            {loading && <Loader />}
            {/* Login Form  */}
            <div className="login_Form bg-pink-50 px-8 py-6 border border-pink-100 rounded-xl shadow-md">
                {/* Top Heading  */}
                <div className="mb-5">
                    <h2 className='text-center text-2xl font-bold text-pink-500 '>
                    </h2>
                </div>
                {/* Input One  */}
                <div className="mb-3">
                    <input
                        type="text"
                        placeholder='Full Name'
                        value={userSignup.name}
                        onChange={(e) => {
                            setUserSignup({
                                ...userSignup,
                                name: e.target.value
                            })
                        }}
                        className='bg-pink-50 border border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-200'
                    />
                </div>
                {/* Input Two  */}
                <div className="mb-3">
                    <input
                        type="email"
                        placeholder='Email Address'
                        value={userSignup.email}
                        onChange={(e) => {
                            setUserSignup({
                                ...userSignup,
                                email: e.target.value
                            })
                        }}
                        className='bg-pink-50 border border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-200'
                    />
                </div>
                {/* Input Three  */}
                <div className="mb-5">
                    <input
                        type="password"
                        placeholder='Password'
                        value={userSignup.password}
                        onChange={(e) => {
                            setUserSignup({
                                ...userSignup,
                                password: e.target.value
                            })
                        }}
                        className='bg-pink-50 border border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-200'
                    />
                </div>
                {/* Signup Button  */}
                <div className="mb-5">
                    <button
                        type='button'
                        onClick={userSignupFunction}
                        className='bg-pink-500 hover:bg-pink-600 w-full text-white text-center py-2 font-bold rounded-md '
                    >
                        Sign up
                    </button>
                </div>
                <div>
                    <h2 className='text-black'>Have an account <Link className=' text-pink-500 font-bold' href={'/login'}>Login</Link></h2>
                </div>
            </div>
        </div>
    );
}

export default SignUpContent