import express from "express";
import { PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "../swagger.json"

const port = 3000
const app = express()
const prisma = new PrismaClient()

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

//O GET, assim como SELECT, é usado para buscar dados.
//BUSCAR FILME, REQUISIÇÃO
app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: { 
            title: "asc"
        },
        include: {
            genres: true,
            languages: true
        }
    })
    res.json(movies) 
})

//CADASTRAR FILME
app.post("/movies", async (req, res)=> {
    const { title, genre_id, language_id, oscar_count, 
        release_date } = req.body
    
    try{
        const movieWithSameTitle = await prisma.movie.findFirst({
            where: {
                title: { equals: title, mode: "insensitive"}
            }
        })

        if(movieWithSameTitle){
            return res
            .status(409) //deu conflito com algum tipo de dado
            .send({message: "Ja existe um filme cadastrado com esse título"}) //409 se deu algum conflito
        }

    await prisma.movie.create({
        data: {
        title,
        genre_id,
        language_id,
        oscar_count,
        release_date: new Date(release_date),
        } 
    })
    }catch(error){
        return res.status(500).send({message: "Erro ao cadastrar o filme"})
    }
    res.status(201).send()
})

//O PUT, assim como o UPDATE, é usado para alterar dados
//ALTERAR OS DADOS DE UM FILME JA EXISTENTE
app.put("/movies/:id", async (req, res)=> {
    const id = Number(req.params.id)

    try{
        const movie = await prisma.movie.findUnique({
            where: {
                id
            }
        })

        if(!movie){
            return res.status(404).send({ message: "Filme não encontrado"})
        }

        const data = { ...req.body };
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;
        //pegar os dados do filme que será atualizado e atualiza-lo no prisma
        await prisma.movie.update({
            where: {
                id
            },
            data: data
        });
    }catch(error){
        return res.status(500).send({message: "Falha ao atualizar o registro do filme"})
    }

    res.status(200).send()
})

//O DELETE, assim como o comando do banco com o mesmo nome, é usado para remover dados
app.delete("/movies/:id", async (req, res)=> {
    const id = Number(req.params.id)

    try{
        const movie = await prisma.movie.findUnique({
            where: {
                id
            }
        })

        if(!movie){
            return res.status(404).send({message: "Filme não encontrado"})
        }

        await prisma.movie.delete({
            where: {
                id
            },
        });
    }catch(error){
        return res.status(500).send({message: "Não foi possível remover o filme"})
    }

    res.status(200).send()
})

//buscar os filmes por gênero
app.get("/movies/:genreName", async (req, res)=> {
    try{
        const movieFilteredByGenreName = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true
            },
            where: {
                genres: {
                    name: {
                        equals: req.params.genreName,
                        mode: "insensitive"
                    }
                }
            }
        })
    res.status(200).send(movieFilteredByGenreName)
    }catch(error){
        res.status(500).send({message: "Falhas ao filtrar filme por genero"})
    }
});

//atualizar informações de genero
app.put("/genres/:id", async (req, res)=> {
    //1. Extrai o `id` da rota e o `name` do body da requisição
    const { id } = req.params;
    const { name } = req.body

    //2. Verifica se o `name` foi fornecido. Se não, 
    //retorna um erro 400(indicar campo obrigatório) ao cliente informando que o nome é obrigatório.
    if(!name){
        res.status(400).send({ message: "o nome do genero é obrigatório"})
    }

    try{
        //3. Tenta encontrar um gênero com o (id fornecido). Se o gênero não for encontrado, retorna um erro 404 ao cliente.
        const genres = await prisma.genre.findUnique({
            where: {
                id: Number(id)
            }
        })

        if(!genres){
            res.status(404).send({message: "genero não econtrado"})
        }
        //4. Verifica se já existe outro gênero com o mesmo nome (ignorando maiúsculas e minúsculas), excluindo o gênero que está sendo atualizado. Se um gênero com o mesmo nome já existir, retorna um erro 409 ao cliente.
        const genreSameName = await prisma.genre.findFirst({
            where: {
                name: { equals: name, mode:"insensitive" },
                id: { not: Number(id) } //não pegar o id acho
            }
        })
           
        if(genreSameName){
            return res.status(409).send({message: "Esse nome de genero ja existe"})
        }
        //5. Se não houver conflito, atualiza o gênero com o novo nome.
        await prisma.genre.update({
            where: { id: Number(id) },
            data: {name}
        })
    }catch(error){
        //7. Se ocorrer um erro durante qualquer parte do processo, retorna um erro 500 ao cliente.
        return res.status(500).send({message: "erro ao atualizar informações de genero"})
    }
    //6. Se a atualização for bem-sucedida, retorna o gênero atualizado ao cliente com um status 200.
    res.status(200).send({message: "genero atualizado com sucesso"})
})

//adicionado novo genero
app.post("/genres", async (req, res)=> {
    const { name } = req.body

    try{
        const genreName = await prisma.genre.findFirst({
            where: {
                name: { equals: name, mode:"insensitive" }
            }
        })

        //não consegui fazer a verificação se vazio

        if(genreName){
            return res.status(409).send({message: "Esse nome de genero ja existe"})
        }

        await prisma.genre.create({
            data: {
                name
            }
        })

    }catch(error){
        res.status(500).send({message: "Erro ao cadastrar genero"})
    }
    res.status(201).send({message: "genero criado com sucesso"})

})

//listar todos os generos
app.get("/genres", async (req, res)=> {
    const { name } = req.body

    const genres = await prisma.genre.findMany({
        where: {
            name: name
        }
    })
    res.json(genres)
})

//remover generos
app.delete("/genres/:id", async (req, res)=> {
    const { id } = req.params

    try {
        const genre = await prisma.genre.findUnique({
            where: {
                id: Number(id)
            }
        })

        if(!genre){
            return res.status(404).send({message: "genero não encontrado"})
        }

        await prisma.genre.delete({
            where: {
                id: Number(id)
            }
        })

    }catch(error){
        return res.status(500).send({message: "Houve um erro ao deletar o genero"})
    }
    res.status(200).send({message: "Genero deletado com sucesso"})
})

app.listen(port, ()=> {
    console.log(`Servidor em execução na porta ${port}`)
})