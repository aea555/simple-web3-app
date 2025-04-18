use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;

declare_id!("2yErQiMAVSgabTtYt9FJQY6sUyBX7P1R1N7i1m2ytRY3");

#[program]
pub mod rsa_storage {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn store_rsa_key(ctx: Context<StoreKey>, rsa_key: String) -> Result<()> {
        ctx.accounts.user_rsa.rsa_key = rsa_key;
        Ok(())
    }

    pub fn get_rsa_key(ctx: Context<GetKey>) -> Result<String> {
        Ok(ctx.accounts.user_rsa.rsa_key.clone())
    }

    pub fn store_file_metadata(
        ctx: Context<StoreFileMetadata>,
        cid: String,
        is_public: bool,
    ) -> Result<()> {
        let metadata = &mut ctx.accounts.file_metadata;
        metadata.cid = cid;
        metadata.uploader = ctx.accounts.uploader.key();
        metadata.timestamp = Clock::get()?.unix_timestamp;
        metadata.is_public = is_public;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
#[instruction()]
pub struct StoreKey<'info> {
    #[account(
        init,
        seeds = [b"user_rsa", user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + 512
    )]
    pub user_rsa: Account<'info, UserRSAKey>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetKey<'info> {
    #[account(
        seeds = [b"user_rsa", user.key().as_ref()],
        bump,
    )]
    pub user_rsa: Account<'info, UserRSAKey>,

    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(cid: String)]
pub struct StoreFileMetadata<'info> {
    #[account(
        init_if_needed,
        seeds = [b"file_metadata", &keccak::hash(cid.as_bytes()).to_bytes()[..]],
        bump,
        payer = uploader,
        space = 8 + 128 + 32 + 8 + 1 
    )]
    pub file_metadata: Account<'info, FileMetadata>,

    #[account(mut)]
    pub uploader: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserRSAKey {
    pub rsa_key: String,
}

#[account]
pub struct FileMetadata {
    pub cid: String,             // IPFS CID
    pub uploader: Pubkey,        // who uploaded
    pub timestamp: i64,          // UNIX timestamp
    pub is_public: bool,         // access policy
}
