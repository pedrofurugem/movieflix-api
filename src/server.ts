import express from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "../swagger.json"


const port = 3000
const app = express()
const prisma = new PrismaClient()

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

//rota 6 - /movies?sort=releaseDate
//rota 7 - /movies?language=xx
//rota 8 - /movies?language=en&sort=releaseDate
app.get("/movies", async (req, res) => {
    const { sort, language } = req.query
    
    let orderBy = undefined;
    if(sort === "title"){
        orderBy = {
            title: "asc"
        }
    }else if(sort === "release_date"){
        orderBy = {
            release_date: "asc"
        }
    }

    let where = undefined
    if(language){
        where = {
            languages: {
                name: {
                    equals: language,
                    mode: "insensitive"
                }
            }
        }
    }
    
    try{
        const movies = await prisma.movie.findMany({
            orderBy,
            where,
            include: {
                genres: true,
                languages: true
            },
        })
        
        const moviesQuantity = await prisma.movie.count({
            orderBy: {
                id: "asc"
            }
        })
       
        res.json({movies, moviesQuantity})
    }catch(error){
        return res.status(500).send({message: "Houve um erro ao buscar a lista de filmes"})
    }
})


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

app.put("/genres/:id", async (req, res)=> {
    const { id } = req.params
    const { name } = req.body

    if(!name){
        return res.status(400).send({ message: "o nome do genero é obrigatório"})
    }

    try{
        const genre = await prisma.genre.findUnique({
                where: {
                id: Number(id)
            }
        })

        if(!genre){
            return res.status(404).send({message: "genero não econtrado"})
        }
        
        const genreSameName = await prisma.genre.findFirst({
            where: {
                name: { equals: name, mode:"insensitive" },
                id: { not: Number(id) } //não pegar o id acho
            }
        })
           
        if(genreSameName){
            return res.status(409).send({message: "Esse nome de genero ja existe"})
        }
        
        await prisma.genre.update({
            where: { id: Number(id) },
            data: {name}
        })
        
    }catch(error){
        return res.status(500).send({message: "erro ao atualizar informações de genero"})
    }
    res.status(200).send({message: "genero atualizado com sucesso"})
})

app.post("/genres", async (req, res)=> {
    const { name } = req.body

    if(!name){
        return res.status(400).send({ message: "um nome de genero é obrigatório"})
    }

    try{
        const genreName = await prisma.genre.findFirst({
            where: {
                name: { equals: name, mode:"insensitive" }
            }
        })
        
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

app.get("/genres", async (req, res)=> {
    const { name } = req.body

    try{
        const genres = await prisma.genre.findMany({
            where: {
                name: name
            }
        })
        res.json(genres)
    }catch(error){
        return res.status(500).send({message: "Houve um erro ao buscar a lista de generos"})
    }
})

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