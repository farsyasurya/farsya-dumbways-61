import express from "express";
import { Pool } from "pg";
import multer from "multer";
import path from "path";
import session from "express-session";
import flash from "express-flash";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;

const db = new Pool({
  user: "postgres",
  password: "farsya060707",
  host: "localhost",
  port: 5432,
  database: "portfolio-task",
});

app.set("view engine", "hbs");
app.set("views", "src/views");

app.use("/assets", express.static("src/assets"));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./src/assets/uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

app.get("/", home);
app.get("/admin", admin);

app.get("/login", login);
app.post("/login", handleLogin);
app.get("/register", register);
app.post("/register", handleRegister);

app.post("/admin/skill", upload.single("image_skill"), handleSkill);
app.post("/admin/work", upload.single("image_work"), handleWork);
app.post("/admin/project", upload.single("image_project"), handleProject);

//edit data
app.get("/admin/skill/edit/:id", renderEditSkill);
app.post("/admin/skill/edit/:id", upload.single("image_skill"), updateSkill);

app.get("/admin/work/edit/:id", renderEditWork);
app.post("/admin/work/edit/:id", upload.single("image_work"), updateWork);

app.get("/admin/project/edit/:id", renderEditProject);
app.post(
  "/admin/project/edit/:id",
  upload.single("image_project"),
  updateProject
);

// Delete data
app.post("/admin/skill/delete/:id", deleteSkill);
app.post("/admin/work/delete/:id", deleteWork);
app.post("/admin/project/delete/:id", deleteProject);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

async function home(req, res) {
  const result = await db.query(`SELECT * FROM work ORDER BY id DESC`);
  const resultSkill = await db.query(`SELECT * FROM skill ORDER BY id DESC`);
  const resultProject = await db.query(
    `SELECT * FROM my_project ORDER BY id DESC`
  );
  res.render("index", { result, resultSkill, resultProject });
}

async function admin(req, res) {
  const result = await db.query(`SELECT * FROM work ORDER BY id DESC`);
  const resultSkill = await db.query(`SELECT * FROM skill ORDER BY id DESC`);
  const resultProject = await db.query(
    `SELECT * FROM my_project ORDER BY id DESC`
  );
  res.render("admin", {
    result,
    resultSkill,
    resultProject,
    userData: req.session.user?.name || "Admin",
  });
}

function register(req, res) {
  res.render("register", { message: req.flash("error") });
}

async function handleRegister(req, res) {
  const { name, email, password } = req.body;
  const isRegistered = await db.query(
    `SELECT * FROM public.user WHERE email = '${email}'`
  );
  if (isRegistered.rows.length) {
    req.flash("error", "Email sudah terdaftar!");
    return res.redirect("/register");
  }

  const hashed = await bcrypt.hash(password, 10);
  await db.query(
    `INSERT INTO public.user(email, password, name) VALUES ('${email}', '${hashed}', '${name}')`
  );
  res.redirect("/login");
}

function login(req, res) {
  res.render("login", { message: req.flash("error") });
}

async function handleLogin(req, res) {
  const { email, password } = req.body;
  const user = await db.query(
    `SELECT * FROM public.user WHERE email = '${email}'`
  );
  if (
    !user.rows.length ||
    !(await bcrypt.compare(password, user.rows[0].password))
  ) {
    req.flash("error", "Email atau password salah");
    return res.redirect("/login");
  }
  req.session.user = {
    name: user.rows[0].name,
    email: user.rows[0].email,
  };
  res.redirect("/admin");
}

async function handleSkill(req, res) {
  const { nameSkill } = req.body;
  const imageSkill = req.file?.filename;
  if (!nameSkill || !imageSkill) {
    req.flash("error", "Semua field wajib diisi");
    return res.redirect("/admin");
  }
  await db.query(
    `INSERT INTO skill (name, image_skill) VALUES ('${nameSkill}', '${imageSkill}')`
  );
  res.redirect("/admin");
}

async function handleWork(req, res) {
  const {
    work,
    company,
    list_one,
    list_two,
    list_three,
    list_four,
    tech_one,
    tech_two,
    tech_three,
    tech_four,
  } = req.body;
  const imageWork = req.file?.filename;
  await db.query(
    `INSERT INTO work (work, company, list_one, list_two, list_three, list_four, tech_one, tech_two, tech_three, tech_four, image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      work,
      company,
      list_one,
      list_two,
      list_three,
      list_four,
      tech_one,
      tech_two,
      tech_three,
      tech_four,
      imageWork,
    ]
  );
  res.redirect("/admin");
}

async function handleProject(req, res) {
  const {
    project_name,
    description,
    tech1,
    tech2,
    tech3,
    tech4,
    link_project,
  } = req.body;
  const imageProject = req.file?.filename;
  await db.query(
    `INSERT INTO my_project (project_name, description, tech1, tech2, tech3, tech4, link_project, image_project)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      project_name,
      description,
      tech1,
      tech2,
      tech3,
      tech4,
      link_project,
      imageProject,
    ]
  );
  res.redirect("/admin");
}

// Edit
async function renderEditSkill(req, res) {
  const id = req.params.id;
  const result = await db.query(`SELECT * FROM skill WHERE id = $1`, [id]);
  res.render("edit-skill", { skill: result.rows[0] });
}

async function updateSkill(req, res) {
  const id = req.params.id;
  const { nameSkill } = req.body;
  const imageSkill = req.file?.filename;
  if (imageSkill) {
    await db.query(
      `UPDATE skill SET name = $1, image_skill = $2 WHERE id = $3`,
      [nameSkill, imageSkill, id]
    );
  } else {
    await db.query(`UPDATE skill SET name = $1 WHERE id = $2`, [nameSkill, id]);
  }
  res.redirect("/admin");
}

async function renderEditWork(req, res) {
  const id = req.params.id;
  const result = await db.query(`SELECT * FROM work WHERE id = $1`, [id]);
  res.render("edit-work", { work: result.rows[0] });
}

async function updateWork(req, res) {
  const id = req.params.id;
  const {
    work,
    company,
    list_one,
    list_two,
    list_three,
    list_four,
    tech_one,
    tech_two,
    tech_three,
    tech_four,
  } = req.body;
  const image = req.file?.filename;

  const values = [
    work,
    company,
    list_one,
    list_two,
    list_three,
    list_four,
    tech_one,
    tech_two,
    tech_three,
    tech_four,
    id,
  ];
  if (image) {
    values.splice(10, 0, image);
    await db.query(
      `UPDATE work SET work = $1, company = $2, list_one = $3, list_two = $4, list_three = $5, list_four = $6,
       tech_one = $7, tech_two = $8, tech_three = $9, tech_four = $10, image = $11 WHERE id = $12`,
      values
    );
  } else {
    await db.query(
      `UPDATE work SET work = $1, company = $2, list_one = $3, list_two = $4, list_three = $5, list_four = $6,
       tech_one = $7, tech_two = $8, tech_three = $9, tech_four = $10 WHERE id = $11`,
      values
    );
  }
  res.redirect("/admin");
}

async function renderEditProject(req, res) {
  const id = req.params.id;
  const result = await db.query(`SELECT * FROM my_project WHERE id = $1`, [id]);
  res.render("edit-project", { project: result.rows[0] });
}

async function updateProject(req, res) {
  const id = req.params.id;
  const {
    project_name,
    description,
    tech1,
    tech2,
    tech3,
    tech4,
    link_project,
  } = req.body;
  const image = req.file?.filename;

  const values = [
    project_name,
    description,
    tech1,
    tech2,
    tech3,
    tech4,
    link_project,
    id,
  ];
  if (image) {
    values.splice(7, 0, image);
    await db.query(
      `UPDATE my_project SET project_name = $1, description = $2, tech1 = $3, tech2 = $4, tech3 = $5,
       tech4 = $6, link_project = $7, image_project = $8 WHERE id = $9`,
      values
    );
  } else {
    await db.query(
      `UPDATE my_project SET project_name = $1, description = $2, tech1 = $3, tech2 = $4, tech3 = $5,
       tech4 = $6, link_project = $7 WHERE id = $8`,
      values
    );
  }
  res.redirect("/admin");
}

// Delete
async function deleteSkill(req, res) {
  await db.query(`DELETE FROM skill WHERE id = $1`, [req.params.id]);
  res.redirect("/admin");
}

async function deleteWork(req, res) {
  await db.query(`DELETE FROM work WHERE id = $1`, [req.params.id]);
  res.redirect("/admin");
}

async function deleteProject(req, res) {
  await db.query(`DELETE FROM my_project WHERE id = $1`, [req.params.id]);
  res.redirect("/admin");
}
