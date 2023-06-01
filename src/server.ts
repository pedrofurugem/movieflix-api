import express from "express";
import { PrismaClient } from "@prisma/client";

const port = 3000
const app = express()
const prisma = new PrismaClient()

app.use(express.json());

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

app.post("/movies", async (req, res)=> {
    const { title, genre_id, language_id, oscar_count, 
        release_date } = req.body
    
    try{
        // case insensitive - se a busca for feita por john wick ou John wick ou JOHN WICK,
        //o registro vai ser retornado na consulta

        //case sensitive - se buscar por john wick e no banco estiver como John wick, não vai ser retornado na cosulta
        const movieWithSameTitle = await prisma.movie.findFirst({
            where: {
                //titulo onde equals igual o titulo recebido da requisição
                //modo é insensitivo
                title: { equals: title, mode: "insensitive"}
            }
        })

        if(movieWithSameTitle){
            return res
            .status(409)
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

//qualquer coisa após os dois pontos será o id
app.put("/movies/:id", async (req, res)=> {
    //pegar o id do registro que vai ser atualizado
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

    //retornar o status correto informando que o filme foi atualizado
    res.status(200).send()
})

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

//filtrar os filmes por gênero
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

app.listen(port, ()=> {
    console.log(`Servidor em execução na porta ${port}`)
})