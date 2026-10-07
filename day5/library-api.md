# Library API Design

A REST API for a library's **books** resource. All requests and responses use JSON.

**Base URL:** `/api`

## Book object

- `id`: number, assigned by the server
- `title`: string, required
- `author`: string, required
- `year`: number, optional
- `isbn`: string, optional

Example:

```json
{
  "id": 1,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958,
  "isbn": "9780385474542"
}
```

## Endpoints

### 1. List all books

- **Method:** GET
- **Path:** `/books`
- **Description:** Returns an array of every book in the library.
- **Request body:** none
- **Success status:** 200 OK

### 2. Get one book

- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns the single book with the given id.
- **Request body:** none
- **Success status:** 200 OK

### 3. Create a book

- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book; the server assigns the id and returns the created book.
- **Request body:**

```json
{
  "title": "Half of a Yellow Sun",
  "author": "Chimamanda Ngozi Adichie",
  "year": 2006
}
```

- **Success status:** 201 Created

### 4. Update a book

- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Request body:**

```json
{
  "title": "Half of a Yellow Sun",
  "author": "Chimamanda Ngozi Adichie",
  "year": 2007
}
```

- **Success status:** 200 OK

### 5. Delete a book

- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes the book with the given id.
- **Request body:** none
- **Success status:** 204 No Content

### 6. List books by an author

- **Method:** GET
- **Path:** `/books?author={name}`
- **Description:** Returns only the books written by the given author, using a query parameter.
- **Example:** `/books?author=Chinua%20Achebe`
- **Request body:** none
- **Success status:** 200 OK (an empty array if the author has no books)

## Error codes

### 400 Bad Request

The request is invalid or incomplete.

- **Example:** `POST /books` with a body that has no `title`, such as `{ "author": "Chinua Achebe" }`.
- **Example response:**

```json
{ "error": "title is required" }
```

### 404 Not Found

The requested book does not exist.

- **Example:** `GET /books/9999` when no book has the id 9999.
- **Example response:**

```json
{ "error": "Book not found" }
```
