const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");

const server = jsonServer.create();

const router = jsonServer.router("./db.json");

const db = JSON.parse(fs.readFileSync("./db.json", "UTF-8"));

const middlewares = jsonServer.defaults();
const PORT = process.env.PORT || 3000;

server.use(middlewares);

server.use(jsonServer.defaults());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

const SECRET_KEY = "123456789";
const expiresIn = "1h";

function createToken(payload) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function verifyToken(token) {
    return jwt.verify(token, SECRET_KEY, (err, decode) =>
        decode !== undefined ? decode : err
    );
}

function isAuthenticated({ email, password }) {
    return (
        db.users.findIndex(
            (user) => user.email === email && user.password === password
        ) !== -1
    );
}

server.post("/register", (req, res) => {
    const { username, email, password } = req.body;

    exist_user = db.users.findIndex((x) => x.email === email);
    if (exist_user !== -1) {
        return res.status(401).json({
            status: 401,
            message: "Email already in use!",
        });
    }

    const new_user = {
        id: db.users.length + 1,
        username,
        email,
        password,
    };

    db.users.push(new_user);
    fs.writeFileSync("./db.json", JSON.stringify(db), () => {
        if (err) return console.log(err);
        console.log("writing to " + fileName);
    });
    res.status(201).json({
        status: 201,
        message: "Success",
        data: new_user,
    });
});

//login
server.post("/login", (req, res) => {
    // const {email, password} = req.body
    const email = req.body.email;
    const password = req.body.password;

    if (isAuthenticated({ email, password }) === false) {
        const status = 401;
        const message = "Incorrect email or password";
        res.status(status).json({ status, message });
        return;
    }
    const access_token = createToken({ email, password });
    res.status(200).json({
        status: 200,
        message: "Success",
        data: {
            access_token,
        },
    });
});

server.use("/auth", (req, res, next) => {
    if (
        req.headers.authorization == undefined ||
        req.headers.authorization.split(" ")[0] !== "Bearer"
    ) {
        const status = 401;
        const message = "Bad authorization header";
        res.status(status).json({ status, message });
        return;
    }
    try {
        let verifyTokenResult;
        verifyTokenResult = verifyToken(req.headers.authorization.split(" ")[1]);

        if (verifyTokenResult instanceof Error) {
            const status = 401;
            const message = "Error: access_token is not valid";
            res.status(status).json({ status, message });
            return;
        }
        next();
    } catch (err) {
        const status = 401;
        const message = "Token is our of date.";
        res.status(status).json({ status, message });
    }
});

//view all users
server.get("/auth/users", (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            users: db.users,
        },
    });
});

//view user by email
server.get("/auth/users/:email", (req, res) => {
    const email = req.params.email;

    const exist_email = db.users.findIndex((user) => user.email == email);
    const result = db.users.filter((user) => user.email == email);
    if (exist_email !== -1) {
        const status = 200;
        return res.status(status).json({ status, result });
    } else {
        return res.status(401).json({
            status: 401,
            message: "Email is not found!!",
        });
    }
});

//DO SOMETHING
// Submit an order
server.post("/submit-order", (req, res) => {
    const { id, bookId, customerName, quantity, timestamp } = req.body;

    // Check if the book is available
    const book = db.books.find((book) => book.id === bookId);

    if (!book || !book.available) {
        return res.status(400).json({
            status: 400,
            message: "Invalid: Book not available",
        });
    }

    // Create a new order object
    const newOrder = {
        id: id,
        bookId: bookId,
        customerName: customerName,
        quantity: quantity,
        timestamp: timestamp,
    };

    // Update the quantity of the book
    book.quantity -= quantity;

    // Save the new order and update the book quantity in the database
    db.orders.push(newOrder);
    fs.writeFileSync("./db.json", JSON.stringify(db), (err) => {
        if (err) {
            return res.status(500).json({
                status: 500,
                message: "Internal server error",
            });
        }
        console.log("Order submitted and saved to the database");
    });

    // Return a success response
    return res.status(200).json({
        status: 200,
        message: "Order submitted successfully",
        data: newOrder,
    });
});


//view status
server.get("/status", (req, res) => {
    res.status(200).json({
        status: 200,
        message: "Server is up and running",
    });
});


// Cập nhật đơn hàng
server.patch("/orders/:orderId", (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { customerName } = req.body;

    // Find the order to be updated
    const orderIndex = db.orders.findIndex((order) => order.id === orderId);

    // If order not found
    if (orderIndex === -1) {
        return res.status(404).json({
            status: 404,
            message: "Order not found",
        });
    }

    // Update order information
    db.orders[orderIndex].customerName = customerName;
    fs.writeFileSync("./db.json", JSON.stringify(db), (err) => {
        if (err) return console.log(err);
        console.log("writing to db.json");
    });

    return res.status(200).json({
        status: 200,
        message: "Order updated successfully",
        data: db.orders[orderIndex],
    });
});

server.delete("/orders/:orderId", (req, res) => {
    const orderId = parseInt(req.params.orderId);

    // Find the order to be deleted
    const orderIndex = db.orders.findIndex((order) => order.id === orderId);

    // If order not found
    if (orderIndex === -1) {
        return res.status(404).json({
            status: 404,
            message: "Order not found",
        });
    }

    // Delete the order
    const deletedOrder = db.orders.splice(orderIndex, 1)[0];
    fs.writeFileSync("./db.json", JSON.stringify(db), (err) => {
        if (err) return console.log(err);
        console.log("writing to db.json");
    });

    return res.status(200).json({
        status: 200,
        message: "Order deleted successfully",
        data: deletedOrder,
    });
});

server.get("/orders/:orderId", (req, res) => {
    const orderId = parseInt(req.params.orderId);

    const order = db.orders.find((order) => order.id === orderId);

    if (order) {
        return res.status(200).json({
            status: 200,
            data: order,
        });
    } else {
        return res.status(404).json({
            status: 404,
            message: "Order not found",
        });
    }
});


server.get("/status", (req, res) => {
    res.status(200).json({
        status: 200,
        message: "Server is up and running",
    });
});


//END

server.use(router);

server.listen(PORT, () => {
    console.log("Run Auth API Server");
});



