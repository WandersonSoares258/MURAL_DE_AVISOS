// Função para login
async function login(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token); // Armazena o token no localStorage
            console.log("Token armazenado:", data.token); // Verifique se o token está sendo salvo corretamente
            window.location.replace('/mural');
            setTimeout(carregarAvisos, 100);
        } else {
            alert('Login falhou');
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
    }
}

// Registra o evento de submit do formulário
document.getElementById('loginForm').addEventListener('submit', login);


// Função para registro
async function registro(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            window.location.href = '/login'; // Redireciona para o login após o registro
        } else {
            alert('Erro ao registrar usuário');
        }
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
    }
}

// Função para obter e exibir os avisos
async function carregarAvisos() {
    const token = localStorage.getItem('token');
    console.log("Token recuperado do localStorage:", token);

    if (!token) {
        window.location.href = '/login'; // Se não houver token, redireciona para login
        return;
    }

    try {
        const response = await fetch('/mural', {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            credentials: "include"
        });

        console.log("🔹 Status da resposta:", response.status);

        if (response.status === 403) {
            console.error("🚨 Acesso negado! Redirecionando...");
            alert("Acesso negado. Faça login novamente.");
            localStorage.removeItem("token");
            window.location.href = "/login";
            return;
        }

        if (response.ok) {
            const avisos = await response.json();
            const listaAvisos = document.getElementById('lista-avisos');
            listaAvisos.innerHTML = ''; // Limpa a lista de avisos

            avisos.forEach(aviso => {
                const avisoElemento = document.createElement('div');
                avisoElemento.classList.add('aviso');
                avisoElemento.innerHTML = `
                    <strong>${aviso.username}</strong> (${aviso.departamento})<br>
                    <p>${aviso.mensagem}</p>
                    <small>${new Date(aviso.data).toLocaleString()}</small>
                `;
                listaAvisos.appendChild(avisoElemento);
            });
        } else {
            alert('Erro ao carregar avisos');
        }
    } catch (error) {
        console.error('Erro ao carregar avisos:', error);
    }
}

// Função para criar um aviso
async function criarAviso(event) {
    event.preventDefault();

    const mensagem = document.getElementById('mensagem').value;
    const departamento_id = document.getElementById('departamento').value;
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/avisos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ departamento_id, mensagem }),
        });

        if (response.ok) {
            carregarAvisos(); // Recarrega os avisos após criar um novo
        } else {
            alert('Erro ao criar aviso');
        }
    } catch (error) {
        console.error('Erro ao criar aviso:', error);
    }
}

// Inicializa as funções ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/mural') {
        carregarAvisos();
    }
});
