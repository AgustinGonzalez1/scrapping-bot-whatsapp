import fs from 'fs/promises';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'saved_posts.json');

export class PostStorage {
  constructor() {
    this.posts = {
      desarrollador: [],
      analista: []
    };
  }

  async loadPosts() {
    try {
      const data = await fs.readFile(STORAGE_FILE, 'utf8');
      this.posts = JSON.parse(data);
    } catch (error) {
      // Si el archivo no existe, usar valores por defecto
      console.log('Archivo de posts no encontrado, creando uno nuevo');
      await this.savePosts();
    }
  }

  async savePosts() {
    try {
      await fs.writeFile(STORAGE_FILE, JSON.stringify(this.posts, null, 2));
    } catch (error) {
      console.error('Error guardando posts:', error.message);
    }
  }

  async addPost(category, urn) {
    if (!this.posts[category]) {
      this.posts[category] = [];
    }
    
    if (!this.posts[category].includes(urn)) {
      this.posts[category].push(urn);
      await this.savePosts();
      return true; // Post nuevo
    }
    return false; // Post ya existe
  }

  async isPostSaved(category, urn) {
    return this.posts[category]?.includes(urn) || false;
  }

  async getPosts(category) {
    return this.posts[category] || [];
  }

  async getAllPosts() {
    return this.posts;
  }
}

export const storage = new PostStorage();