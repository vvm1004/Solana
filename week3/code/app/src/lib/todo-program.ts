import { AnchorProvider, IdlAccounts, Program, utils } from "@coral-xyz/anchor";
import { TodoApp } from "../../../target/types/todo_app";
import idl from "../../../target/idl/todo_app.json";
import { Cluster, PublicKey, SystemProgram } from "@solana/web3.js";
// import { getProgramId } from "./helper";
interface Profile {
  key: PublicKey;
  name: string;
  authority: PublicKey;
  todoCount: number;
}

export default class TodoProgram {
  program: Program<TodoApp>;
  provider: AnchorProvider;

  constructor(provider: AnchorProvider, cluster: Cluster = "devnet") {
    this.provider = provider;
    this.program = new Program(idl, this.provider);
  }


  // createProfile(name: string) {
  //   const [profile] = PublicKey.findProgramAddressSync(
  //     [utils.bytes.utf8.encode("profile"), this.provider.publicKey.toBytes()],
  //     this.program.programId
  //   );

  //   const builder = this.program.methods.createProfile(name).accounts({
  //     creator: this.provider.publicKey,
  //     profile,
  //     systemProgram: SystemProgram.programId,
  //   } as any);

  //   return builder.transaction();
  // }
  async createProfile(name: string): Promise<string> {
    const [profile] = PublicKey.findProgramAddressSync(
      [utils.bytes.utf8.encode("profile"), this.provider.publicKey.toBytes()],
      this.program.programId
    );

    return await this.program.methods
      .createProfile(name)
      .accounts({
        creator: this.provider.publicKey,
        profile,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
  }
  async toggleTodo(profileKey: PublicKey, todoIndex: number) {
  const [todo] = PublicKey.findProgramAddressSync(
    [Buffer.from("todo"), profileKey.toBytes(), Buffer.from([todoIndex])],
    this.program.programId
  );

  return await this.program.methods
    .toggleTodo()
    .accounts({
      creator: this.provider.publicKey,
      profile: profileKey,
      todo,
    } as any)
    .rpc();
}
async deleteTodo(profileKey: PublicKey, todoIndex: number) {
  const [todo] = PublicKey.findProgramAddressSync(
    [Buffer.from("todo"), profileKey.toBytes(), Buffer.from([todoIndex])],
    this.program.programId
  );

  return await this.program.methods
    .deleteTodo()
    .accounts({
      creator: this.provider.publicKey,
      profile: profileKey,
      todo,
    } as any)
    .rpc();
}


  fetchProfile() {
    const [profile] = PublicKey.findProgramAddressSync(
      [utils.bytes.utf8.encode("profile"), this.provider.publicKey.toBytes()],
      this.program.programId
    );

    return this.program.account.profile.fetch(profile);
  }

  createTodo(content: string, todoIndex: number) {
    const [profile] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), this.provider.publicKey.toBytes()],
      this.program.programId
    );

    const [todo] = PublicKey.findProgramAddressSync(
      [Buffer.from("todo"), profile.toBytes(), Buffer.from([todoIndex])],
      this.program.programId
    );

    const builder = this.program.methods.createTodo(content).accounts({
      creator: this.provider.publicKey,
      profile,
      todo,
      systemProgram: SystemProgram.programId,
    } as any);

    return builder.transaction();
  }

  async fetchTodos(profile: Profile) {
    const todoCount = profile.todoCount;

    const todoPdas: PublicKey[] = [];

    for (let i = 0; i < todoCount; i++) {
      const [todo] = PublicKey.findProgramAddressSync(
        [Buffer.from("todo"), profile.key.toBytes(), Buffer.from([i])],
        this.program.programId
      );

      todoPdas.push(todo);
    }

    return Promise.all(
      todoPdas.map((pda) => this.program.account.todo.fetch(pda))
    );
  }
}
