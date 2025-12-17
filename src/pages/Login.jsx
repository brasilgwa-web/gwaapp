
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    // Translate common Supabase auth errors to Portuguese
    const translateAuthError = (errorMessage) => {
        const translations = {
            'Invalid login credentials': 'Credenciais inválidas. Verifique seu email e senha.',
            'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
            'User not found': 'Usuário não encontrado.',
            'Invalid password': 'Senha incorreta.',
            'Email already registered': 'Este email já está cadastrado.',
            'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
            'Signup requires a valid password': 'É necessário uma senha válida.',
            'Unable to validate email address': 'Email inválido.',
            'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
            'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.',
        };

        for (const [eng, pt] of Object.entries(translations)) {
            if (errorMessage?.toLowerCase().includes(eng.toLowerCase())) {
                return pt;
            }
        }
        return errorMessage || 'Erro de autenticação. Tente novamente.';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
                navigate(from, { replace: true });
            } else {
                const { user, session } = await signup(email, password, fullName);
                if (user && !session) {
                    setMessage("Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.");
                    setIsLogin(true);
                } else {
                    // Auto login if email confirmation is not enabled
                    navigate(from, { replace: true });
                }
            }
        } catch (err) {
            console.error("Auth failed:", err);
            setError(translateAuthError(err.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">WGA Brasil</CardTitle>
                    <CardDescription className="text-center">
                        {isLogin ? "Entre com seu email e senha" : "Crie uma nova conta"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {message && (
                            <Alert>
                                <AlertTitle>Sucesso</AlertTitle>
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Seu Nome"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isLogin ? "Entrando..." : "Cadastrando..."}
                                </>
                            ) : (
                                isLogin ? "Entrar" : "Cadastrar"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 justify-center">
                    <Button
                        variant="link"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setMessage('');
                        }}
                    >
                        {isLogin ? "Não tem uma conta? Cadastre-se" : "Já tem conta? Entre"}
                    </Button>
                    {isLogin && (
                        <p className="text-xs text-slate-500">
                            Esqueceu sua senha? Entre em contato com o suporte.
                        </p>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
